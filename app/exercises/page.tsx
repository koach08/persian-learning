"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getCEFRProgress } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";

interface ExerciseInfo {
  href: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  storageKey: string;
}

const exercises: ExerciseInfo[] = [
  {
    href: "/exercises/listening",
    title: "聴解クイズ",
    subtitle: "音声を聞いて正しい意味を選ぶ",
    icon: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z",
    color: "bg-teal-500",
    storageKey: "listening-history",
  },
  {
    href: "/exercises/dictation",
    title: "ディクテーション",
    subtitle: "音声を聞いてペルシア語で書く",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    color: "bg-cyan-500",
    storageKey: "dictation-scores",
  },
  {
    href: "/exercises/cloze",
    title: "穴埋め問題",
    subtitle: "文中の空欄を埋める",
    icon: "M4 6h16M4 12h8m-8 6h16",
    color: "bg-violet-500",
    storageKey: "cloze-scores",
  },
  {
    href: "/exercises/sentence-build",
    title: "語順並べ替え",
    subtitle: "単語を正しい順に並べる",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    color: "bg-amber-500",
    storageKey: "sentence-build-scores",
  },
];

function getRecentScore(storageKey: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length > 0) {
      // Get the most recent score
      const last = data[data.length - 1];
      return last?.score ?? last?.accuracy ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export default function ExercisesPage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [scores, setScores] = useState<Record<string, number | null>>({});

  useEffect(() => {
    setLevel(getCEFRProgress().currentLevel);
    const s: Record<string, number | null> = {};
    for (const ex of exercises) {
      s[ex.href] = getRecentScore(ex.storageKey);
    }
    setScores(s);
  }, []);

  // Sort: exercises without scores first (recommended)
  const sorted = [...exercises].sort((a, b) => {
    const aScore = scores[a.href];
    const bScore = scores[b.href];
    if (aScore === null && bScore !== null) return -1;
    if (aScore !== null && bScore === null) return 1;
    return 0;
  });

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-2">練習ドリル</h1>
      <p className="text-sm text-gray-500 mb-6">現在のレベル: {level}</p>

      <div className="grid gap-4">
        {sorted.map((ex) => {
          const score = scores[ex.href];
          const isRecommended = score === null;
          return (
            <Link key={ex.href} href={ex.href}
              className={`flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border ${
                isRecommended ? "border-emerald-200 ring-1 ring-emerald-100" : "border-gray-100"
              }`}>
              <div className={`${ex.color} w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={ex.icon} />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">{ex.title}</h2>
                  {isRecommended && (
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full font-medium">
                      おすすめ
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{ex.subtitle}</p>
                {score !== null && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    最近のスコア: <span className={`font-medium ${score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500"}`}>{score}%</span>
                  </p>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
