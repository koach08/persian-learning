// Mistake tracker — records errors and auto-creates/resets SRS cards

import { getAllCards, saveAllCards, createNewCard, calculateSRS } from "./srs";

export interface MistakeEntry {
  persian: string;
  romanization: string;
  japanese: string;
  source: string; // e.g. "guided-lesson", "grammar", "cloze", "dictation", "sentence-build", "conversation"
  score: number;
  date: string;
}

interface MistakeHistory {
  entries: MistakeEntry[];
}

const STORAGE_KEY = "mistake-history";
const MAX_ENTRIES = 500;

function loadHistory(): MistakeHistory {
  if (typeof window === "undefined") return { entries: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function saveHistory(history: MistakeHistory): void {
  if (typeof window === "undefined") return;
  // Trim to max entries
  if (history.entries.length > MAX_ENTRIES) {
    history.entries = history.entries.slice(-MAX_ENTRIES);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function recordMistake(
  persian: string,
  romanization: string,
  japanese: string,
  source: string,
  score: number
): void {
  // 1. Save to mistake history
  const history = loadHistory();
  history.entries.push({
    persian,
    romanization,
    japanese,
    source,
    score,
    date: new Date().toISOString(),
  });
  saveHistory(history);

  // 2. Create or reset SRS card
  const cards = getAllCards();
  if (!cards[persian]) {
    // Card doesn't exist → create it
    cards[persian] = createNewCard(persian);
  } else {
    // Card exists → reset with quality 0 (forgot)
    cards[persian] = calculateSRS(cards[persian], 0);
  }
  saveAllCards(cards);
}

export function getMistakeHistory(): MistakeEntry[] {
  return loadHistory().entries;
}

export function getRecentMistakes(count: number = 20): MistakeEntry[] {
  const entries = loadHistory().entries;
  return entries.slice(-count);
}
