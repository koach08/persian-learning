import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Pronunciation assessment using Whisper transcription + text similarity.
 * Azure Pronunciation Assessment does NOT support fa-IR (Persian),
 * so we use Whisper to transcribe and compare against the reference text.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const referenceText = formData.get("referenceText") as string | null;

    if (!audioFile || !referenceText) {
      return NextResponse.json({ error: "audio and referenceText required" }, { status: 400 });
    }

    console.log(`[pron-assess] file size: ${audioFile.size}, ref: "${referenceText}"`);

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "fa",
    });

    const spokenText = transcription.text?.trim() || "";
    console.log(`[pron-assess] Whisper result: "${spokenText}"`);

    if (!spokenText) {
      return NextResponse.json({
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        words: [],
        recognizedText: "",
      });
    }

    // Normalize and score
    const refWords = normalizePersian(referenceText).split(" ").filter(Boolean);
    const spkWords = normalizePersian(spokenText).split(" ").filter(Boolean);

    if (refWords.length === 0) {
      return NextResponse.json({
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        words: [],
        recognizedText: spokenText,
      });
    }

    // Per-word scoring: for each reference word, find best match in spoken words
    const wordResults: { word: string; accuracyScore: number }[] = [];
    const usedIndices = new Set<number>();

    for (const refWord of refWords) {
      let bestScore = 0;
      let bestIdx = -1;

      for (let i = 0; i < spkWords.length; i++) {
        if (usedIndices.has(i)) continue;
        const score = wordSimilarity(refWord, spkWords[i]);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0 && bestScore >= 0.4) {
        usedIndices.add(bestIdx);
      }

      wordResults.push({
        word: refWord,
        accuracyScore: Math.round(bestScore * 100),
      });
    }

    // Accuracy: average of per-word scores
    const accuracyScore = Math.round(
      wordResults.reduce((sum, w) => sum + w.accuracyScore, 0) / wordResults.length
    );

    // Completeness: % of reference words that had a decent match (>= 50%)
    const matchedCount = wordResults.filter((w) => w.accuracyScore >= 50).length;
    const completenessScore = Math.round((matchedCount / refWords.length) * 100);

    // Fluency: combination of completeness and word order
    const orderScore = calculateOrderScore(refWords, spkWords);
    const fluencyScore = Math.round(completenessScore * 0.6 + orderScore * 0.4);

    // Map word results back to original (non-normalized) reference words
    const originalRefWords = referenceText
      .replace(/[.،؟!؛:«»\-]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    const finalWords = wordResults.map((w, i) => ({
      word: originalRefWords[i] || w.word,
      accuracyScore: w.accuracyScore,
    }));

    return NextResponse.json({
      accuracyScore,
      fluencyScore,
      completenessScore,
      words: finalWords,
      recognizedText: spokenText,
    });
  } catch (e) {
    console.error("[pron-assess] Error:", e);
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 });
  }
}

function normalizePersian(text: string): string {
  return text
    .replace(/\u200c/g, "")
    .replace(/\u0643/g, "\u06A9")
    .replace(/\u064A/g, "\u06CC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[.،؟!؛:«»\-\s]+/g, " ")
    .trim();
}

function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  const dist = levenshtein(a, b);
  return (maxLen - dist) / maxLen;
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

function calculateOrderScore(refWords: string[], spkWords: string[]): number {
  // Check how many reference words appear in the correct relative order in spoken text
  const normalizedSpk = spkWords.map((w) => w);
  let lastFoundIdx = -1;
  let inOrder = 0;
  let found = 0;

  for (const rw of refWords) {
    let bestIdx = -1;
    let bestSim = 0;
    for (let i = 0; i < normalizedSpk.length; i++) {
      const sim = wordSimilarity(rw, normalizedSpk[i]);
      if (sim > bestSim && sim >= 0.5) {
        bestSim = sim;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      found++;
      if (bestIdx > lastFoundIdx) {
        inOrder++;
        lastFoundIdx = bestIdx;
      }
    }
  }

  return found > 0 ? (inOrder / found) * 100 : 0;
}
