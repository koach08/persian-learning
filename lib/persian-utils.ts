// Shared Persian text utilities — extracted from guided-lesson and conversation-practice

/** Normalize Persian text for comparison */
export function normalizePersian(text: string): string {
  return text
    // Remove ZWNJ (zero-width non-joiner)
    .replace(/\u200c/g, "")
    // Normalize Arabic Kaf to Persian Kaf
    .replace(/\u0643/g, "\u06A9")
    // Normalize Arabic Yeh to Persian Yeh
    .replace(/\u064A/g, "\u06CC")
    // Remove diacritics
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // Remove punctuation
    .replace(/[.،؟!؛:«»\-\s]+/g, " ")
    .trim()
    .toLowerCase();
}

/** Levenshtein edit distance between two strings */
export function levenshteinDistance(a: string, b: string): number {
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

/** Word-level similarity score (0-100) */
export function getSimilarity(
  target: string,
  spoken: string,
  mode?: string,
  clozeWord?: string
): number {
  const na = normalizePersian(target);
  const nb = normalizePersian(spoken);
  if (na === nb) return 100;

  const expectedWords = na.split(" ").filter(Boolean);
  const spokenWords = nb.split(" ").filter(Boolean);
  if (expectedWords.length === 0) return 0;
  if (spokenWords.length === 0) return 0;

  let matchedWords = 0;
  for (const ew of expectedWords) {
    const bestWordMatch = Math.max(
      ...spokenWords.map((sw) => {
        if (ew === sw) return 1;
        const maxLen = Math.max(ew.length, sw.length);
        if (maxLen === 0) return 0;
        return (maxLen - levenshteinDistance(ew, sw)) / maxLen;
      }),
      0
    );
    if (bestWordMatch >= 0.5) matchedWords++;
  }

  let score = (matchedWords / expectedWords.length) * 100;

  // Cloze bonus: if the key word is in the spoken text, big boost
  if (mode === "cloze" && clozeWord && nb.includes(normalizePersian(clozeWord))) {
    score = Math.max(score, 80);
  }

  // Also try full-string Levenshtein as fallback (for short phrases)
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen > 0) {
    const charSimilarity = ((maxLen - levenshteinDistance(na, nb)) / maxLen) * 100;
    score = Math.max(score, charSimilarity);
  }

  return Math.round(score);
}
