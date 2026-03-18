import type { SRSCard } from "./srs";
import { isMastered } from "./srs";

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const CEFR_LABELS: Record<CEFRLevel, string> = {
  A1: "入門",
  A2: "初級",
  B1: "中級",
  B2: "中上級",
  C1: "上級",
  C2: "マスター",
};

export const CEFR_COLORS: Record<CEFRLevel, string> = {
  A1: "emerald",
  A2: "blue",
  B1: "purple",
  B2: "orange",
  C1: "rose",
  C2: "amber",
};

const STORAGE_KEY = "cefr-progress";
const UNLOCK_THRESHOLD = 0.8;

export interface CEFRProgress {
  currentLevel: CEFRLevel;
  unlockedLevels: CEFRLevel[];
}

export function getCEFRProgress(): CEFRProgress {
  if (typeof window === "undefined") {
    return { currentLevel: "A1", unlockedLevels: ["A1"] };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  return { currentLevel: "A1", unlockedLevels: ["A1"] };
}

export function saveCEFRProgress(progress: CEFRProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function setCurrentLevel(level: CEFRLevel): void {
  const progress = getCEFRProgress();
  if (progress.unlockedLevels.includes(level)) {
    progress.currentLevel = level;
    saveCEFRProgress(progress);
  }
}

export function checkAndUnlockLevels(
  srsCards: Record<string, SRSCard>,
  wordsByLevel: Record<CEFRLevel, string[]>
): CEFRLevel[] {
  const progress = getCEFRProgress();

  for (let i = 0; i < CEFR_LEVELS.length - 1; i++) {
    const level = CEFR_LEVELS[i];
    const nextLevel = CEFR_LEVELS[i + 1];
    const words = wordsByLevel[level] || [];
    if (words.length === 0) continue;

    const masteredCount = words.filter(
      (w) => srsCards[w] && isMastered(srsCards[w])
    ).length;
    const ratio = masteredCount / words.length;

    if (ratio >= UNLOCK_THRESHOLD && !progress.unlockedLevels.includes(nextLevel)) {
      progress.unlockedLevels.push(nextLevel);
    }
  }

  saveCEFRProgress(progress);
  return progress.unlockedLevels;
}

export function getLevelMasteryStats(
  srsCards: Record<string, SRSCard>,
  wordsByLevel: Record<CEFRLevel, string[]>
): Record<CEFRLevel, { total: number; mastered: number; due: number }> {
  const today = new Date().toISOString().split("T")[0];
  const stats = {} as Record<CEFRLevel, { total: number; mastered: number; due: number }>;

  for (const level of CEFR_LEVELS) {
    const words = wordsByLevel[level] || [];
    let mastered = 0;
    let due = 0;
    for (const w of words) {
      const card = srsCards[w];
      if (card) {
        if (isMastered(card)) mastered++;
        if (card.nextReviewDate <= today) due++;
      } else {
        due++;
      }
    }
    stats[level] = { total: words.length, mastered, due };
  }

  return stats;
}
