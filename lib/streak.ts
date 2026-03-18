// Streak management — localStorage-based daily study tracking

interface StreakData {
  dates: string[]; // YYYY-MM-DD format
  currentStreak: number;
}

const STORAGE_KEY = "persian-streak";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function loadData(): StreakData {
  if (typeof window === "undefined") return { dates: [], currentStreak: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dates: [], currentStreak: 0 };
    return JSON.parse(raw);
  } catch {
    return { dates: [], currentStreak: 0 };
  }
}

function saveData(data: StreakData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = new Date(sorted[i]);
    const prev = new Date(sorted[i + 1]);
    const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function recordActivity(): void {
  const data = loadData();
  const today = getToday();
  if (!data.dates.includes(today)) {
    data.dates.push(today);
  }
  data.currentStreak = calcStreak(data.dates);
  saveData(data);
}

export function getStreak(): number {
  const data = loadData();
  return calcStreak(data.dates);
}

export function hasStudiedToday(): boolean {
  const data = loadData();
  return data.dates.includes(getToday());
}
