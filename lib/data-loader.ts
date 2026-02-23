import Papa from "papaparse";

export interface VocabularyItem {
  カテゴリー: string;
  ペルシア語: string;
  ローマ字: string;
  日本語: string;
  英語: string;
  備考: string;
}

export interface ConjugationItem {
  "動詞（不定形）": string;
  ローマ字: string;
  日本語: string;
  現在語幹: string;
  過去語幹: string;
  時制: string;
  "من (私)": string;
  "تو (君)": string;
  "او (彼/彼女)": string;
  "ما (私達)": string;
  "شما (あなた達)": string;
  "آنها (彼ら)": string;
}

export async function loadVocabulary(): Promise<VocabularyItem[]> {
  const res = await fetch("/data/vocabulary.csv");
  const text = await res.text();
  const { data } = Papa.parse<VocabularyItem>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return data;
}

export async function loadConjugations(): Promise<ConjugationItem[]> {
  const res = await fetch("/data/verb_conjugations.csv");
  const text = await res.text();
  const { data } = Papa.parse<ConjugationItem>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return data;
}
