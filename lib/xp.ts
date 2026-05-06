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

const GOAL_MET_FLAG = "xp-goal-just-met";

export function addXP(action: XPAction): number {
  const data = loadData();
  const points = XP_VALUES[action];
  const today = getToday();

  const beforeXP = data.dailyXP[today] || 0;
  data.totalXP += points;
  data.dailyXP[today] = beforeXP + points;
  saveData(data);

  // Detect first-time daily goal crossing
  if (beforeXP < data.dailyGoal && data.dailyXP[today] >= data.dailyGoal) {
    if (typeof window !== "undefined") {
      localStorage.setItem(GOAL_MET_FLAG, today);
    }
  }

  return points;
}

/** Check and consume the "goal just met" flag. Returns true once per day. */
export function consumeGoalMetFlag(): boolean {
  if (typeof window === "undefined") return false;
  const flag = localStorage.getItem(GOAL_MET_FLAG);
  if (flag === getToday()) {
    localStorage.removeItem(GOAL_MET_FLAG);
    return true;
  }
  return false;
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
