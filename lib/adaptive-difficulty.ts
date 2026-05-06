// Adaptive difficulty — Krashen's i+1 comprehensible input
// Tracks recent accuracy to decide whether to include challenge items

import { CEFR_LEVELS, getCEFRProgress, type CEFRLevel } from "./level-manager";

const STORAGE_KEY = "adaptive-accuracy-log";
const WINDOW = 20; // last N items
const CHALLENGE_THRESHOLD = 0.85; // above this → add i+1 items
const EASE_THRESHOLD = 0.50; // below this → add i-1 review

interface AccuracyEntry {
  correct: boolean;
  timestamp: number;
}

function loadLog(): AccuracyEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLog(log: AccuracyEntry[]): void {
  if (typeof window === "undefined") return;
  // Keep only the last 100 entries to avoid bloat
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(-100)));
}

/** Record an exercise result for adaptive tracking */
export function recordAccuracy(correct: boolean): void {
  const log = loadLog();
  log.push({ correct, timestamp: Date.now() });
  saveLog(log);
}

/** Get the rolling accuracy over the last WINDOW items */
export function getRollingAccuracy(): number {
  const log = loadLog();
  const recent = log.slice(-WINDOW);
  if (recent.length < 5) return 0.5; // not enough data
  const correct = recent.filter((e) => e.correct).length;
  return correct / recent.length;
}

export interface AdaptiveLevel {
  baseLevel: CEFRLevel;
  shouldChallenge: boolean;
  shouldEase: boolean;
  /** Ratio of items from the challenge level (0-1) */
  challengeRatio: number;
}

/** Get adaptive difficulty recommendation */
export function getAdaptiveLevel(): AdaptiveLevel {
  const progress = getCEFRProgress();
  const base = progress.currentLevel;
  const accuracy = getRollingAccuracy();

  const idx = CEFR_LEVELS.indexOf(base);
  const hasHigherLevel = idx < CEFR_LEVELS.length - 1;
  const hasLowerLevel = idx > 0;

  if (accuracy >= CHALLENGE_THRESHOLD && hasHigherLevel) {
    return {
      baseLevel: base,
      shouldChallenge: true,
      shouldEase: false,
      challengeRatio: 0.2, // 20% challenge items
    };
  }

  if (accuracy <= EASE_THRESHOLD && hasLowerLevel) {
    return {
      baseLevel: base,
      shouldChallenge: false,
      shouldEase: true,
      challengeRatio: 0.3, // 30% easier review items
    };
  }

  return {
    baseLevel: base,
    shouldChallenge: false,
    shouldEase: false,
    challengeRatio: 0,
  };
}
