// Streak management — localStorage-based daily study tracking with freeze support

interface StreakData {
  dates: string[]; // YYYY-MM-DD format
  currentStreak: number;
  longestStreak: number;
  freezes: number; // earned by 7-day streaks, max 2
  freezesUsed: string[]; // dates where a freeze was consumed
}

const STORAGE_KEY = "persian-streak";
const MAX_FREEZES = 2;

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getDateStr(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0];
}

function loadData(): StreakData {
  if (typeof window === "undefined") return { dates: [], currentStreak: 0, longestStreak: 0, freezes: 1, freezesUsed: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dates: [], currentStreak: 0, longestStreak: 0, freezes: 1, freezesUsed: [] };
    const parsed = JSON.parse(raw);
    // Migration: add new fields for old data
    return {
      dates: parsed.dates || [],
      currentStreak: parsed.currentStreak || 0,
      longestStreak: parsed.longestStreak || parsed.currentStreak || 0,
      freezes: parsed.freezes ?? 1,
      freezesUsed: parsed.freezesUsed || [],
    };
  } catch {
    return { dates: [], currentStreak: 0, longestStreak: 0, freezes: 1, freezesUsed: [] };
  }
}

function saveData(data: StreakData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function calcStreak(dates: string[], freezesAvailable: number, freezesUsed: string[]): { streak: number; newFreezesUsed: string[] } {
  if (dates.length === 0) return { streak: 0, newFreezesUsed: [] };
  const sorted = [...new Set(dates)].sort().reverse();
  const today = getToday();
  const yesterday = getDateStr(1);
  const dayBefore = getDateStr(2);

  // Must include today, yesterday, or day-before-yesterday (with freeze)
  if (sorted[0] !== today && sorted[0] !== yesterday) {
    // Check if we can use a freeze: last study was 2 days ago
    if (sorted[0] === dayBefore && freezesAvailable > 0) {
      // Use freeze for yesterday
      const usedDate = yesterday;
      if (!freezesUsed.includes(usedDate)) {
        return calcStreakWithFreeze(sorted, [usedDate]);
      }
    }
    return { streak: 0, newFreezesUsed: [] };
  }

  return calcStreakWithFreeze(sorted, []);
}

function calcStreakWithFreeze(sorted: string[], initialFreezes: string[]): { streak: number; newFreezesUsed: string[] } {
  let streak = 1;
  const newFreezesUsed = [...initialFreezes];

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = new Date(sorted[i]);
    const prev = new Date(sorted[i + 1]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else if (diffDays === 2 && newFreezesUsed.length < MAX_FREEZES) {
      // Gap of 1 day — can bridge with freeze (already consumed or new)
      streak++;
    } else {
      break;
    }
  }
  return { streak, newFreezesUsed };
}

export function recordActivity(): void {
  const data = loadData();
  const today = getToday();
  if (!data.dates.includes(today)) {
    data.dates.push(today);
  }

  const { streak, newFreezesUsed } = calcStreak(data.dates, data.freezes, data.freezesUsed);
  data.currentStreak = streak;
  data.freezesUsed = [...data.freezesUsed, ...newFreezesUsed.filter((d) => !data.freezesUsed.includes(d))];

  // Consume freezes that were used
  if (newFreezesUsed.length > 0) {
    data.freezes = Math.max(0, data.freezes - newFreezesUsed.length);
  }

  // Update longest streak
  if (streak > data.longestStreak) {
    data.longestStreak = streak;
  }

  // Award freeze at every 7-day milestone
  if (streak > 0 && streak % 7 === 0) {
    const milestoneKey = `freeze-${streak}`;
    if (!data.freezesUsed.includes(milestoneKey)) {
      data.freezes = Math.min(MAX_FREEZES, data.freezes + 1);
      data.freezesUsed.push(milestoneKey); // prevent double-award
    }
  }

  saveData(data);
}

export function getStreak(): number {
  const data = loadData();
  const { streak } = calcStreak(data.dates, data.freezes, data.freezesUsed);
  return streak;
}

export function getLongestStreak(): number {
  return loadData().longestStreak;
}

export function getFreezesRemaining(): number {
  return loadData().freezes;
}

export function hasStudiedToday(): boolean {
  const data = loadData();
  return data.dates.includes(getToday());
}
