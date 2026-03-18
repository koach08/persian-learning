import type { CEFRLevel } from "./level-manager";

export interface MinimalPairWord {
  persian: string;
  romanization: string;
  japanese: string;
}

export interface MinimalPair {
  id: string;
  word1: MinimalPairWord;
  word2: MinimalPairWord;
  soundContrast: string;
  contrastDescription: string;
  level: CEFRLevel;
}

export const MINIMAL_PAIRS: MinimalPair[] = [
  // ─── A1: 基本的な音の区別 ───
  {
    id: "mp-01",
    word1: { persian: "باد", romanization: "bâd", japanese: "風" },
    word2: { persian: "پاد", romanization: "pâd", japanese: "対抗" },
    soundContrast: "ب vs پ",
    contrastDescription: "有声 b vs 無声 p（唇の位置は同じ）",
    level: "A1",
  },
  {
    id: "mp-02",
    word1: { persian: "دار", romanization: "dâr", japanese: "木" },
    word2: { persian: "تار", romanization: "târ", japanese: "弦/暗い" },
    soundContrast: "د vs ت",
    contrastDescription: "有声 d vs 無声 t",
    level: "A1",
  },
  {
    id: "mp-03",
    word1: { persian: "زن", romanization: "zan", japanese: "女性" },
    word2: { persian: "سن", romanization: "sen", japanese: "年齢" },
    soundContrast: "ز vs س",
    contrastDescription: "有声 z vs 無声 s",
    level: "A1",
  },
  {
    id: "mp-04",
    word1: { persian: "بار", romanization: "bâr", japanese: "荷物/回" },
    word2: { persian: "بور", romanization: "bur", japanese: "ブロンド" },
    soundContrast: "آ vs او",
    contrastDescription: "長母音 â vs u",
    level: "A1",
  },
  {
    id: "mp-05",
    word1: { persian: "سیر", romanization: "sir", japanese: "にんにく/満腹" },
    word2: { persian: "سور", romanization: "sur", japanese: "宴会" },
    soundContrast: "ی vs او",
    contrastDescription: "母音 i vs u",
    level: "A1",
  },
  {
    id: "mp-06",
    word1: { persian: "کار", romanization: "kâr", japanese: "仕事" },
    word2: { persian: "گار", romanization: "gâr", japanese: "接尾辞（〜する人）" },
    soundContrast: "ک vs گ",
    contrastDescription: "無声 k vs 有声 g",
    level: "A1",
  },

  // ─── A2: ペルシア語特有の音 ───
  {
    id: "mp-07",
    word1: { persian: "قلب", romanization: "qalb", japanese: "心臓" },
    word2: { persian: "غلب", romanization: "ghalb", japanese: "克服" },
    soundContrast: "ق vs غ",
    contrastDescription: "口蓋垂破裂音 q vs 口蓋垂摩擦音 gh（ペルシア語学習者が最も混同する音）",
    level: "A2",
  },
  {
    id: "mp-08",
    word1: { persian: "حال", romanization: "hâl", japanese: "状態/気分" },
    word2: { persian: "هال", romanization: "hâl", japanese: "ホール" },
    soundContrast: "ح vs ه",
    contrastDescription: "咽頭摩擦音 h vs 声門摩擦音 h（現代ペルシア語ではほぼ同音）",
    level: "A2",
  },
  {
    id: "mp-09",
    word1: { persian: "عمل", romanization: "amal", japanese: "行動" },
    word2: { persian: "امل", romanization: "amal", japanese: "希望" },
    soundContrast: "ع vs ا",
    contrastDescription: "声門破裂音 ' vs 母音 a（アラビア語からの借用で区別、現代ペルシア語ではほぼ同音）",
    level: "A2",
  },
  {
    id: "mp-10",
    word1: { persian: "خار", romanization: "khâr", japanese: "とげ" },
    word2: { persian: "خوار", romanization: "khâr", japanese: "卑しい" },
    soundContrast: "خا vs خوا",
    contrastDescription: "khâ vs khvâ（口語ではほぼ同音になるが書き分け）",
    level: "A2",
  },
  {
    id: "mp-11",
    word1: { persian: "شیر", romanization: "shir", japanese: "ライオン/牛乳" },
    word2: { persian: "سیر", romanization: "sir", japanese: "にんにく" },
    soundContrast: "ش vs س",
    contrastDescription: "sh (後部歯茎摩擦音) vs s (歯茎摩擦音)",
    level: "A2",
  },

  // ─── B1: より微妙な区別 ───
  {
    id: "mp-12",
    word1: { persian: "ثبت", romanization: "sabt", japanese: "登録" },
    word2: { persian: "سبت", romanization: "sabt", japanese: "安息日" },
    soundContrast: "ث vs س",
    contrastDescription: "現代ペルシア語では同音（どちらも s）。正書法のみの区別",
    level: "B1",
  },
  {
    id: "mp-13",
    word1: { persian: "ذکر", romanization: "zekr", japanese: "言及" },
    word2: { persian: "زکر", romanization: "zakr", japanese: "（稀な語）" },
    soundContrast: "ذ vs ز",
    contrastDescription: "現代ペルシア語では同音（どちらも z）。書き分けの知識が重要",
    level: "B1",
  },
  {
    id: "mp-14",
    word1: { persian: "صبر", romanization: "sabr", japanese: "忍耐" },
    word2: { persian: "سبر", romanization: "sabr", japanese: "（稀な語）" },
    soundContrast: "ص vs س",
    contrastDescription: "アラビア語では咽頭化 s vs 通常 s。ペルシア語では同音だが書き分け",
    level: "B1",
  },
  {
    id: "mp-15",
    word1: { persian: "ضرب", romanization: "zarb", japanese: "掛け算/打撃" },
    word2: { persian: "ظرب", romanization: "zarb", japanese: "（稀な語）" },
    soundContrast: "ض vs ظ",
    contrastDescription: "現代ペルシア語では同音（どちらも z）。スペリングの区別",
    level: "B1",
  },
  {
    id: "mp-16",
    word1: { persian: "مست", romanization: "mast", japanese: "酔った" },
    word2: { persian: "ماست", romanization: "mâst", japanese: "ヨーグルト" },
    soundContrast: "短母音 a vs 長母音 â",
    contrastDescription: "短母音 a（書かれない）vs 長母音 â（ا で表記）",
    level: "B1",
  },

  // ─── B2: 口語 vs 正式の発音差 ───
  {
    id: "mp-17",
    word1: { persian: "آن", romanization: "ân", japanese: "あの（正式）" },
    word2: { persian: "اون", romanization: "un", japanese: "あの（口語）" },
    soundContrast: "正式 ân vs 口語 un",
    contrastDescription: "書き言葉と話し言葉の発音の違い",
    level: "B2",
  },
  {
    id: "mp-18",
    word1: { persian: "می‌خواهم", romanization: "mi-khâham", japanese: "〜したい（正式）" },
    word2: { persian: "می‌خوام", romanization: "mi-khâm", japanese: "〜したい（口語）" },
    soundContrast: "正式 vs 口語の縮約",
    contrastDescription: "口語では母音が縮約される",
    level: "B2",
  },
];

export function getMinimalPairsByLevel(level: CEFRLevel): MinimalPair[] {
  return MINIMAL_PAIRS.filter((p) => p.level === level);
}

// Storage
const MP_STORAGE_KEY = "minimal-pairs-progress";

export interface MinimalPairsProgress {
  scores: Record<string, { correct: number; total: number }>;
}

export function getMinimalPairsProgress(): MinimalPairsProgress {
  if (typeof window === "undefined") return { scores: {} };
  const raw = localStorage.getItem(MP_STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  return { scores: {} };
}

export function saveMinimalPairsProgress(progress: MinimalPairsProgress): void {
  localStorage.setItem(MP_STORAGE_KEY, JSON.stringify(progress));
}
