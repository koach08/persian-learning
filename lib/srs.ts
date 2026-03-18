export interface SRSCard {
  key: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastQuality: number;
}

export type SRSQuality = 0 | 3 | 4 | 5;

const STORAGE_KEY = "srs-cards";

export function createNewCard(key: string): SRSCard {
  return {
    key,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString().split("T")[0],
    lastQuality: 0,
  };
}

export function calculateSRS(card: SRSCard, quality: SRSQuality): SRSCard {
  const updated = { ...card, lastQuality: quality };

  if (quality < 3) {
    updated.repetitions = 0;
    updated.interval = 0;
  } else {
    if (updated.repetitions === 0) {
      updated.interval = 1;
    } else if (updated.repetitions === 1) {
      updated.interval = 3;
    } else {
      updated.interval = Math.round(card.interval * card.easeFactor);
    }
    updated.repetitions += 1;
  }

  const ef =
    card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  updated.easeFactor = Math.max(1.3, ef);

  const next = new Date();
  next.setDate(next.getDate() + updated.interval);
  updated.nextReviewDate = next.toISOString().split("T")[0];

  return updated;
}

export function isDue(card: SRSCard): boolean {
  const today = new Date().toISOString().split("T")[0];
  return card.nextReviewDate <= today;
}

export function getAllCards(): Record<string, SRSCard> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);

  // Migrate from old flashcard-progress
  const old = localStorage.getItem("flashcard-progress");
  if (old) {
    const oldData = JSON.parse(old) as Record<string, "known" | "again">;
    const migrated: Record<string, SRSCard> = {};
    for (const [key, status] of Object.entries(oldData)) {
      const card = createNewCard(key);
      if (status === "known") {
        card.repetitions = 1;
        card.interval = 1;
        card.lastQuality = 4;
        const next = new Date();
        next.setDate(next.getDate() + 1);
        card.nextReviewDate = next.toISOString().split("T")[0];
      }
      migrated[key] = card;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    localStorage.removeItem("flashcard-progress");
    return migrated;
  }

  return {};
}

export function saveAllCards(cards: Record<string, SRSCard>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function getDueCount(cards: Record<string, SRSCard>): number {
  return Object.values(cards).filter(isDue).length;
}

export function isMastered(card: SRSCard): boolean {
  return card.repetitions >= 3;
}
