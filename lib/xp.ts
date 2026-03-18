// XP (Experience Points) system — localStorage-based

export const XP_VALUES = {
  flashcardReview: 5,
  lessonStep: 10,
  conversationTurn: 15,
  exerciseCorrect: 10,
  sessionComplete: 20,
} as const;

export type XPAction = keyof typeof XP_VALUES;

interface XPData {
  totalXP: number;
  dailyXP: Record<string, number>; // "YYYY-MM-DD" → XP earned that day
  dailyGoal: number;
}

const STORAGE_KEY = "xp-data";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function loadData(): XPData {
  if (typeof window === "undefined") return { totalXP: 0, dailyXP: {}, dailyGoal: 100 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { totalXP: 0, dailyXP: {}, dailyGoal: 100 };
    return JSON.parse(raw);
  } catch {
    return { totalXP: 0, dailyXP: {}, dailyGoal: 100 };
  }
}

function saveData(data: XPData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addXP(action: XPAction): number {
  const data = loadData();
  const points = XP_VALUES[action];
  const today = getToday();

  data.totalXP += points;
  data.dailyXP[today] = (data.dailyXP[today] || 0) + points;
  saveData(data);
  return points;
}

export function getTodayXP(): number {
  const data = loadData();
  return data.dailyXP[getToday()] || 0;
}

export function getDailyGoal(): number {
  return loadData().dailyGoal;
}

export function getTotalXP(): number {
  return loadData().totalXP;
}

export function isDailyGoalMet(): boolean {
  return getTodayXP() >= getDailyGoal();
}
