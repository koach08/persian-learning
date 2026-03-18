"use client";

import { useState, useEffect, useMemo } from "react";
import { loadVocabulary, loadConjugations } from "./data-loader";
import type { VocabularyItem, ConjugationItem } from "./data-loader";
import type { CEFRLevel } from "./level-manager";
import { CEFR_LEVELS } from "./level-manager";
import { getCustomVocab } from "./custom-vocab";

export function useMergedVocabulary(levelFilter?: CEFRLevel | "all") {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVocabulary().then((csvData) => {
      const custom = getCustomVocab();
      const merged = [...csvData, ...custom];
      setItems(merged);
      setLoading(false);
    });
  }, []);

  const filtered =
    levelFilter && levelFilter !== "all"
      ? items.filter((i) => i.レベル === levelFilter)
      : items;

  const upToLevel = (level: CEFRLevel) => {
    const idx = CEFR_LEVELS.indexOf(level);
    return items.filter((i) => CEFR_LEVELS.indexOf(i.レベル) <= idx);
  };

  const categories = useMemo(() => [...new Set(filtered.map((i) => i.カテゴリー))], [filtered]);

  const wordsByLevel = useMemo(() => CEFR_LEVELS.reduce(
    (acc, lvl) => {
      acc[lvl] = items.filter((i) => i.レベル === lvl).map((i) => i.ペルシア語);
      return acc;
    },
    {} as Record<CEFRLevel, string[]>
  ), [items]);

  return { items: filtered, allItems: items, loading, categories, wordsByLevel, upToLevel };
}

export function useConjugations(levelFilter?: CEFRLevel | "all") {
  const [items, setItems] = useState<ConjugationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConjugations().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const filtered =
    levelFilter && levelFilter !== "all"
      ? items.filter((i) => i.レベル === levelFilter)
      : items;

  return { items: filtered, allItems: items, loading };
}
