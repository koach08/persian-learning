import type { VocabularyItem } from "./data-loader";
import type { CEFRLevel } from "./level-manager";
import Papa from "papaparse";

const STORAGE_KEY = "custom-vocabulary";

export function getCustomVocab(): VocabularyItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export function addCustomWord(word: {
  ペルシア語: string;
  ローマ字: string;
  日本語: string;
  英語: string;
  レベル: CEFRLevel;
  カテゴリー?: string;
}): void {
  const items = getCustomVocab();
  const exists = items.some((i) => i.ペルシア語 === word.ペルシア語);
  if (exists) return;

  items.push({
    カテゴリー: word.カテゴリー || "マイ単語",
    ペルシア語: word.ペルシア語,
    ローマ字: word.ローマ字,
    日本語: word.日本語,
    英語: word.英語,
    備考: "",
    レベル: word.レベル,
    _source: "custom",
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function deleteCustomWord(persian: string): void {
  const items = getCustomVocab().filter((i) => i.ペルシア語 !== persian);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function exportCustomVocab(): string {
  const items = getCustomVocab();
  const rows = items.map((i) => ({
    カテゴリー: i.カテゴリー,
    ペルシア語: i.ペルシア語,
    ローマ字: i.ローマ字,
    日本語: i.日本語,
    英語: i.英語,
    備考: i.備考,
    レベル: i.レベル,
  }));
  return Papa.unparse(rows);
}

export function importCustomVocab(csvText: string): number {
  const { data } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  let count = 0;
  for (const row of data) {
    if (row.ペルシア語 && row.日本語) {
      addCustomWord({
        ペルシア語: row.ペルシア語,
        ローマ字: row.ローマ字 || "",
        日本語: row.日本語,
        英語: row.英語 || "",
        レベル: (row.レベル as CEFRLevel) || "A1",
        カテゴリー: row.カテゴリー || "マイ単語",
      });
      count++;
    }
  }
  return count;
}
