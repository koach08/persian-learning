import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Server-side pronunciation assessment.
 * 1. Receive raw audio (any format — mp4, webm, wav)
 * 2. Use Whisper to transcribe (handles all formats reliably)
 * 3. Compare transcription with reference text word-by-word
 * 4. Return per-word accuracy + overall scores
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const referenceText = formData.get("referenceText") as string | null;

    if (!audioFile || !referenceText) {
      return NextResponse.json({ error: "audio and referenceText required" }, { status: 400 });
    }

    // Step 1: Whisper transcription (accepts any audio format)
    let transcription = "";
    try {
      const result = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "fa",
      });
      transcription = result.text?.trim() || "";
    } catch (e) {
      console.error("Whisper error:", e);
      return NextResponse.json({
        accuracyScore: 0, fluencyScore: 0, completenessScore: 0,
        words: [], recognizedText: "",
      });
    }

    console.log("Whisper heard:", transcription, "| Expected:", referenceText);

    // Step 2: Word-by-word comparison
    const refWords = normalize(referenceText).split(/\s+/).filter(Boolean);
    const spkWords = normalize(transcription).split(/\s+/).filter(Boolean);

    // Match each reference word against spoken words
    const words = refWords.map((rw) => {
      let bestScore = 0;
      for (const sw of spkWords) {
        if (rw === sw) { bestScore = 100; break; }
        const maxLen = Math.max(rw.length, sw.length);
        if (maxLen > 0) {
          const dist = levenshtein(rw, sw);
          bestScore = Math.max(bestScore, Math.round(((maxLen - dist) / maxLen) * 100));
        }
      }
      // Find original script word
      const origWords = referenceText.replace(/\u200c/g, "").split(/\s+/).filter(Boolean);
      const origWord = origWords.find((ow) => normalize(ow) === rw) || rw;
      return { word: origWord, accuracyScore: bestScore };
    });

    // Overall scores
    const totalWords = words.length;
    const accuracyScore = totalWords > 0
      ? Math.round(words.reduce((sum, w) => sum + w.accuracyScore, 0) / totalWords)
      : 0;

    // Completeness: how many reference words were spoken (>50% match)
    const spokenCount = words.filter((w) => w.accuracyScore >= 50).length;
    const completenessScore = totalWords > 0 ? Math.round((spokenCount / totalWords) * 100) : 0;

    // Fluency: based on word count ratio (did they say roughly the right amount?)
    const wordCountRatio = spkWords.length / Math.max(refWords.length, 1);
    const fluencyScore = Math.round(Math.min(wordCountRatio, 1) * 100);

    return NextResponse.json({
      accuracyScore,
      fluencyScore,
      completenessScore,
      words,
      recognizedText: transcription,
    });
  } catch (e) {
    console.error("Assessment error:", e);
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 });
  }
}

function normalize(text: string): string {
  return text
    .replace(/\u200c/g, "")
    .replace(/\u0643/g, "\u06A9")
    .replace(/\u064A/g, "\u06CC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[.،؟!؛:«»\-\s]+/g, " ")
    .trim()
    .toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const m: number[][] = [];
  for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[a.length][b.length];
}
