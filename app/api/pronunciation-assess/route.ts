import { NextRequest, NextResponse } from "next/server";

/**
 * Pronunciation assessment using Azure STT confidence scores.
 *
 * Azure Pronunciation Assessment does NOT support fa-IR (Persian).
 * However, Azure Speech-to-Text DOES support fa-IR and returns
 * word-level confidence scores in detailed format — unclear pronunciation
 * results in lower confidence, making it a practical proxy for pronunciation quality.
 */
export async function POST(req: NextRequest) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return NextResponse.json({ error: "Azure credentials not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const referenceText = formData.get("referenceText") as string | null;

    if (!audioFile || !referenceText) {
      return NextResponse.json({ error: "audio and referenceText required" }, { status: 400 });
    }

    const audioBuffer = await audioFile.arrayBuffer();
    console.log(`[pron-assess] size: ${audioBuffer.byteLength}, ref: "${referenceText}"`);

    // Get Azure token
    const tokenRes = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      { method: "POST", headers: { "Ocp-Apim-Subscription-Key": key, "Content-Length": "0" } }
    );
    if (!tokenRes.ok) {
      return NextResponse.json({ error: "Token fetch failed" }, { status: 500 });
    }
    const token = await tokenRes.text();

    // Azure STT (detailed format) — NO Pronunciation-Assessment header
    // Returns word-level confidence scores for fa-IR
    const sttRes = await fetch(
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=fa-IR&format=detailed`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
          Accept: "application/json",
        },
        body: audioBuffer,
      }
    );

    if (!sttRes.ok) {
      const errText = await sttRes.text().catch(() => "");
      console.error(`[pron-assess] Azure STT failed: ${sttRes.status} ${errText}`);
      return NextResponse.json({ error: `STT failed: ${sttRes.status}` }, { status: 500 });
    }

    const result = await sttRes.json();
    console.log(`[pron-assess] STT result:`, JSON.stringify(result).slice(0, 500));

    if (result.RecognitionStatus !== "Success") {
      return NextResponse.json({
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        words: [],
        recognizedText: "",
        debug: `RecognitionStatus: ${result.RecognitionStatus}`,
      });
    }

    const nbest = result.NBest?.[0];
    if (!nbest) {
      return NextResponse.json({
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        words: [],
        recognizedText: result.DisplayText || "",
      });
    }

    const recognizedText = nbest.Display || nbest.Lexical || "";
    const sttWords: { Word: string; Confidence?: number }[] = nbest.Words || [];

    // Reference words (normalized)
    const refWords = normalizePersian(referenceText).split(" ").filter(Boolean);
    const spkWords = sttWords.map((w) => ({
      raw: w.Word,
      normalized: normalizePersian(w.Word),
      confidence: w.Confidence ?? nbest.Confidence ?? 0,
    }));

    // Match each reference word to spoken words (order-aware)
    // Only search forward from last matched index to preserve word order
    const wordResults: { word: string; accuracyScore: number }[] = [];
    let searchStart = 0;

    for (const refWord of refWords) {
      let bestScore = 0;
      let bestConfidence = 0;
      let bestIdx = -1;

      // Search forward from last match, with a small lookback window (2) for minor reordering
      const windowStart = Math.max(0, searchStart - 2);
      for (let i = windowStart; i < spkWords.length; i++) {
        const sim = wordSimilarity(refWord, spkWords[i].normalized);
        if (sim > bestScore) {
          bestScore = sim;
          bestConfidence = spkWords[i].confidence;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0 && bestScore >= 0.5) {
        searchStart = bestIdx + 1;
        // Combine text similarity with STT confidence
        // Text similarity is the stronger signal for pronunciation quality
        const textScore = bestScore * 100;
        const confScore = bestConfidence * 100;
        const combined = Math.round(textScore * 0.6 + confScore * 0.4);
        wordResults.push({ word: refWord, accuracyScore: combined });
      } else {
        // Word not found in speech — 0 score
        wordResults.push({ word: refWord, accuracyScore: 0 });
      }
    }

    // Accuracy: average of per-word scores
    const accuracyScore = wordResults.length > 0
      ? Math.round(wordResults.reduce((s, w) => s + w.accuracyScore, 0) / wordResults.length)
      : 0;

    // Completeness: % of reference words matched
    const matchedCount = wordResults.filter((w) => w.accuracyScore > 0).length;
    const completenessScore = Math.round((matchedCount / Math.max(refWords.length, 1)) * 100);

    // Fluency: overall confidence * completeness factor
    const overallConfidence = (nbest.Confidence ?? 0) * 100;
    const fluencyScore = Math.round(overallConfidence * 0.7 + completenessScore * 0.3);

    // Map back to original reference words for display
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
      recognizedText,
    });
  } catch (e) {
    console.error("[pron-assess] Error:", e);
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 });
  }
}

function normalizePersian(text: string): string {
  return text
    .replace(/\u200c/g, "")                     // zero-width non-joiner
    .replace(/\u0643/g, "\u06A9")               // Arabic kaf → Persian kaf
    .replace(/\u064A/g, "\u06CC")               // Arabic yeh → Persian yeh
    .replace(/[\u0622\u0623\u0625]/g, "\u0627") // آ أ إ → ا (alef variants)
    .replace(/\u0624/g, "\u0648")               // ؤ → و
    .replace(/\u0626/g, "\u06CC")               // ئ → ی
    .replace(/\u0629/g, "\u0647")               // ة (tā' marbūṭa) → ه
    .replace(/[\u064B-\u065F\u0670]/g, "")      // diacritics
    .replace(/[.،؟!؛:«»\-\s]+/g, " ")
    .trim();
}

function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  const m: number[][] = [];
  for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return (maxLen - m[a.length][b.length]) / maxLen;
}
