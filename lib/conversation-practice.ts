import type { CEFRLevel } from "./level-manager";

// --- Type Definitions ---

export interface ScenarioTurn {
  speaker: "ai" | "user";
  speakerName?: string;
  gender?: "male" | "female";
  persian: string;
  romanization: string;
  japanese: string;
  alternatives?: string[];
  hints?: string[];
}

export interface ScenarioSpeaker {
  name: string;
  gender: "male" | "female";
  role: string;
}

export interface Scenario {
  title: string;
  titlePersian: string;
  level: CEFRLevel;
  description: string;
  speakers?: ScenarioSpeaker[];
  vocabulary: { persian: string; romanization: string; japanese: string }[];
  dialogue: ScenarioTurn[];
}

export interface ScenarioMeta {
  id: string;
  title: string;
  titlePersian: string;
  level: CEFRLevel;
  icon: string;
}

export interface TurnResult {
  turnIndex: number;
  userText: string;
  expectedText: string;
  score: number;
  feedback: string;
  correction?: string;
}

export interface PracticeResult {
  scenarioId: string;
  date: string;
  level: CEFRLevel;
  turnResults: TurnResult[];
  overallScore: number;
}

// --- Scenario List ---

export const SCENARIO_LIST: ScenarioMeta[] = [
  // A1
  { id: "a1-cafe", title: "カフェで注文する", titlePersian: "سفارش دادن در کافه", level: "A1", icon: "☕" },
  { id: "a1-intro", title: "自己紹介をする", titlePersian: "معرفی خود", level: "A1", icon: "👋" },
  { id: "a1-family", title: "家族の話をする", titlePersian: "صحبت درباره خانواده", level: "A1", icon: "👨‍👩‍👧" },
  { id: "a1-taxi", title: "タクシーに乗る", titlePersian: "سوار تاکسی شدن", level: "A1", icon: "🚕" },
  { id: "a1-food", title: "食べ物の好みを言う", titlePersian: "صحبت درباره غذا", level: "A1", icon: "🍽️" },
  { id: "a1-shopping", title: "買い物をする", titlePersian: "خرید کردن", level: "A1", icon: "🛒" },
  // A2
  { id: "a2-restaurant", title: "レストランで注文する", titlePersian: "سفارش دادن در رستوران", level: "A2", icon: "🍕" },
  { id: "a2-directions", title: "道を聞く", titlePersian: "پرسیدن آدرس", level: "A2", icon: "🗺️" },
  { id: "a2-hospital", title: "病院で症状を伝える", titlePersian: "رفتن به بیمارستان", level: "A2", icon: "🏥" },
  { id: "a2-weekend", title: "週末の予定を話す", titlePersian: "برنامه آخر هفته", level: "A2", icon: "📅" },
  { id: "a2-hotel", title: "ホテルにチェックインする", titlePersian: "ورود به هتل", level: "A2", icon: "🏨" },
  { id: "a2-phone", title: "電話で予約する", titlePersian: "رزرو تلفنی", level: "A2", icon: "📞" },
  // B1
  { id: "b1-travel", title: "旅行計画を話し合う", titlePersian: "برنامه‌ریزی سفر", level: "B1", icon: "✈️" },
  { id: "b1-opinion", title: "意見を交換する", titlePersian: "تبادل نظر", level: "B1", icon: "💬" },
  { id: "b1-work", title: "仕事の相談をする", titlePersian: "مشورت درباره کار", level: "B1", icon: "💼" },
  { id: "b1-culture", title: "イラン文化について話す", titlePersian: "صحبت درباره فرهنگ ایران", level: "B1", icon: "🕌" },
  { id: "b1-moving", title: "引越しの相談", titlePersian: "مشورت درباره اسباب‌کشی", level: "B1", icon: "📦" },
  { id: "b1-movie", title: "映画の感想を話す", titlePersian: "نظر درباره فیلم", level: "B1", icon: "🎬" },
  // B2
  { id: "b2-social", title: "社会問題を議論する", titlePersian: "بحث درباره مسائل اجتماعی", level: "B2", icon: "📰" },
  { id: "b2-debate", title: "ディベートする", titlePersian: "مناظره", level: "B2", icon: "⚖️" },
  { id: "b2-dream", title: "将来の夢を語る", titlePersian: "صحبت درباره آرزوها", level: "B2", icon: "🌟" },
  { id: "b2-news", title: "ニュースを討論する", titlePersian: "بحث درباره اخبار", level: "B2", icon: "📺" },
  { id: "b2-compare", title: "文化を比較する", titlePersian: "مقایسه فرهنگ‌ها", level: "B2", icon: "🌍" },
  { id: "b2-business", title: "ビジネス交渉をする", titlePersian: "مذاکره تجاری", level: "B2", icon: "🤝" },
  // C1
  { id: "c1-academic", title: "学術的に議論する", titlePersian: "بحث آکادمیک", level: "C1", icon: "🎓" },
  { id: "c1-negotiation", title: "条件交渉する", titlePersian: "مذاکره شرایط", level: "C1", icon: "📋" },
  { id: "c1-analysis", title: "時事問題を分析する", titlePersian: "تحلیل مسائل روز", level: "C1", icon: "📊" },
  { id: "c1-philosophy", title: "哲学的に語る", titlePersian: "بحث فلسفی", level: "C1", icon: "🧠" },
  { id: "c1-literature", title: "文学を批評する", titlePersian: "نقد ادبی", level: "C1", icon: "📖" },
  { id: "c1-history", title: "歴史を議論する", titlePersian: "بحث تاریخی", level: "C1", icon: "🏛️" },
  // C2
  { id: "c2-nuance", title: "微妙なニュアンスで議論", titlePersian: "بحث با ظرافت", level: "C2", icon: "💎" },
  { id: "c2-rhetoric", title: "説得力ある主張をする", titlePersian: "استدلال قانع‌کننده", level: "C2", icon: "⚡" },
  { id: "c2-poetry", title: "詩と文化を深く語る", titlePersian: "شعر و فرهنگ", level: "C2", icon: "🌹" },
  { id: "c2-satire", title: "風刺とユーモアを使う", titlePersian: "طنز و شوخی", level: "C2", icon: "🎭" },
  { id: "c2-identity", title: "アイデンティティを語る", titlePersian: "هویت و تعلق", level: "C2", icon: "🪞" },
  { id: "c2-diplomacy", title: "外交的に話す", titlePersian: "گفت‌وگوی دیپلماتیک", level: "C2", icon: "🕊️" },
];

export function getScenariosByLevel(level: CEFRLevel): ScenarioMeta[] {
  return SCENARIO_LIST.filter((s) => s.level === level);
}

// --- localStorage Management ---

const RESULTS_KEY = "conversation-practice-results";

export function getSavedResults(): PracticeResult[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(RESULTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveResult(result: PracticeResult): void {
  const results = getSavedResults();
  results.push(result);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

export function getBestScore(scenarioId: string): number | null {
  const results = getSavedResults();
  const scenarioResults = results.filter((r) => r.scenarioId === scenarioId);
  if (scenarioResults.length === 0) return null;
  return Math.max(...scenarioResults.map((r) => r.overallScore));
}

// --- Persian Text Normalization & Matching ---

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

export function quickMatch(userText: string, expected: string, alternatives?: string[]): number {
  const normalizedUser = normalizePersian(userText);
  const normalizedExpected = normalizePersian(expected);

  // Exact match
  if (normalizedUser === normalizedExpected) return 100;

  // Check alternatives
  if (alternatives) {
    for (const alt of alternatives) {
      if (normalizePersian(alt) === normalizedUser) return 100;
    }
  }

  // Levenshtein-based score
  const maxLen = Math.max(normalizedUser.length, normalizedExpected.length);
  if (maxLen === 0) return 0;
  const distance = levenshteinDistance(normalizedUser, normalizedExpected);
  const similarity = ((maxLen - distance) / maxLen) * 100;

  return Math.round(similarity);
}
