import { NextResponse } from "next/server";

// Persian text normalization (same logic as conversation-practice.ts)
function normalizePersian(text: string): string {
  return text
    .replace(/\u200c/g, "")
    .replace(/\u0643/g, "\u06A9")
    .replace(/\u064A/g, "\u06CC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[.،؟!؛:«»\-\s]+/g, " ")
    .trim()
    .toLowerCase();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function computeSimilarity(a: string, b: string): number {
  const na = normalizePersian(a);
  const nb = normalizePersian(b);
  if (na === nb) return 1.0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 0;
  const dist = levenshteinDistance(na, nb);
  return (maxLen - dist) / maxLen;
}

const PRAISE_POOL = ["آفرین!", "عالی!", "خیلی خوب!", "احسنت!", "بسیار عالی!"];

export async function POST(req: Request) {
  try {
    const { targetPhrase, transcribedText, mode, clozeWord } = await req.json();

    if (!targetPhrase || !transcribedText) {
      return NextResponse.json({ match: false, similarity: 0, feedback: "テキストが不足しています" }, { status: 400 });
    }

    let similarity: number;

    if (mode === "cloze" && clozeWord) {
      // In cloze mode, check if the cloze word appears in the transcription
      const normalizedTranscription = normalizePersian(transcribedText);
      const normalizedCloze = normalizePersian(clozeWord);

      // Check if the cloze word is present
      if (normalizedTranscription.includes(normalizedCloze)) {
        // Also check overall phrase similarity
        similarity = computeSimilarity(transcribedText, targetPhrase);
        similarity = Math.max(similarity, 0.8); // Boost if cloze word matched
      } else {
        similarity = computeSimilarity(transcribedText, targetPhrase);
      }
    } else {
      similarity = computeSimilarity(transcribedText, targetPhrase);
    }

    const match = similarity >= 0.7;
    const praise = PRAISE_POOL[Math.floor(Math.random() * PRAISE_POOL.length)];

    return NextResponse.json({
      match,
      similarity: Math.round(similarity * 100) / 100,
      feedback: match ? praise : "もう一度やってみよう！",
    });
  } catch {
    return NextResponse.json({ match: false, similarity: 0, feedback: "エラーが発生しました" }, { status: 500 });
  }
}
