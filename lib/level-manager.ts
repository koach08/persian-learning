import type { SRSCard } from "./srs";
import { isMastered } from "./srs";
import { getLevelLessonStats } from "./guided-lessons";

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
    if (progress.unlockedLevels.includes(nextLevel)) continue;

    // Condition 1: SRS vocabulary mastery (80%)
    const words = wordsByLevel[level] || [];
    let srsUnlock = false;
    if (words.length > 0) {
      const masteredCount = words.filter(
        (w) => srsCards[w] && isMastered(srsCards[w])
      ).length;
      srsUnlock = masteredCount / words.length >= UNLOCK_THRESHOLD;
    }

    // Condition 2: Lesson completion (60% of level's lessons)
    const lessonStats = getLevelLessonStats(level);
    const lessonUnlock = lessonStats.total > 0 && lessonStats.completed / lessonStats.total >= 0.6;

    // Either condition unlocks the next level
    if (srsUnlock || lessonUnlock) {
      progress.unlockedLevels.push(nextLevel);
    }
  }

  saveCEFRProgress(progress);
  return progress.unlockedLevels;
}

/** Lightweight unlock check based on lesson completion only (no vocabulary data needed) */
export function tryUnlockByLessons(): CEFRLevel[] {
  const progress = getCEFRProgress();

  for (let i = 0; i < CEFR_LEVELS.length - 1; i++) {
    const level = CEFR_LEVELS[i];
    const nextLevel = CEFR_LEVELS[i + 1];
    if (progress.unlockedLevels.includes(nextLevel)) continue;

    const stats = getLevelLessonStats(level);
    if (stats.total > 0 && stats.completed / stats.total >= 0.6) {
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
