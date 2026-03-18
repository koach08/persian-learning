"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getCEFRProgress, setCurrentLevel, CEFR_LEVELS } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import { getAllCards, getDueCount } from "@/lib/srs";
import { getStreak, hasStudiedToday } from "@/lib/streak";
import { getNextLesson, getLevelLessonStats } from "@/lib/guided-lessons";
import { getTodayXP, getDailyGoal } from "@/lib/xp";

const SCENARIOS = [
  { label: "カフェで注文", emoji: "☕", scenario: "cafe-order" },
  { label: "道を聞く", emoji: "🗺️", scenario: "ask-directions" },
  { label: "自己紹介", emoji: "👋", scenario: "self-intro" },
  { label: "買い物", emoji: "🛒", scenario: "bazaar-shopping" },
];

const SKILLS = [
  { href: "/flashcard", icon: "📖", label: "単語" },
  { href: "/grammar", icon: "📝", label: "文法" },
  { href: "/conjugation", icon: "🔤", label: "活用" },
  { href: "/exercises", icon: "✏️", label: "ドリル" },
  { href: "/reading", icon: "📚", label: "読解" },
  { href: "/pronunciation", icon: "🎤", label: "発音" },
  { href: "/shadowing", icon: "🎙️", label: "シャドー" },
  { href: "/conversation", icon: "👩‍🏫", label: "会話" },
  { href: "/my-words", icon: "📋", label: "マイ単語" },
  { href: "/dashboard", icon: "📊", label: "進捗" },
];

export default function Home() {
  const [progress, setProgress] = useState(getCEFRProgress());
  const [dueCount, setDueCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [studiedToday, setStudiedToday] = useState(false);
  const [todayXP, setTodayXP] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(100);
  const [lessonInfo, setLessonInfo] = useState<{ id: string; title: string; completed: number; total: number } | null>(null);

  useEffect(() => {
    const p = getCEFRProgress();
    setProgress(p);
    setDueCount(getDueCount(getAllCards()));
    setStreak(getStreak());
    setStudiedToday(hasStudiedToday());
    setTodayXP(getTodayXP());
    setDailyGoal(getDailyGoal());
    const next = getNextLesson(p.currentLevel);
    const stats = getLevelLessonStats(p.currentLevel);
    if (next) {
      setLessonInfo({ id: next.id, title: next.title, completed: stats.completed, total: stats.total });
    }
  }, []);

  const handleLevelChange = (level: CEFRLevel) => {
    if (progress.unlockedLevels.includes(level)) {
      setCurrentLevel(level);
      setProgress({ ...progress, currentLevel: level });
    }
  };

  const xpPercent = Math.min((todayXP / dailyGoal) * 100, 100);

  return (
    <div className="px-5 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-gray-900">ペルシア語</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-amber-500">⚡{todayXP}/{dailyGoal}</span>
          {streak > 0 && (
            <span className="text-sm font-bold text-orange-500">🔥{streak}</span>
          )}
          <span className="text-sm bg-emerald-500 text-white px-3 py-1.5 rounded-full font-bold">
            {progress.currentLevel}
          </span>
        </div>
      </div>

      {/* Level Selector */}
      <div className="flex gap-1.5 mb-8">
        {CEFR_LEVELS.map((level) => {
          const unlocked = progress.unlockedLevels.includes(level);
          const active = progress.currentLevel === level;
          return (
            <button
              key={level}
              onClick={() => handleLevelChange(level)}
              disabled={!unlocked}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                active
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                  : unlocked
                  ? "bg-white text-gray-600 border border-gray-200"
                  : "bg-gray-100 text-gray-300"
              }`}
            >
              {level}
            </button>
          );
        })}
      </div>

      {/* Main CTA — Today's Study */}
      <Link
        href="/today"
        className="block mb-5 p-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl text-white active:scale-[0.97] transition-transform"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0">
            🎯
          </div>
          <div className="flex-1">
            <p className="text-lg font-black">今日の学習を始める</p>
            <p className="text-white/70 text-sm mt-0.5">
              {studiedToday ? "もう少し頑張ろう!" : "SRS復習 → レッスン → 会話"}
            </p>
            {/* XP progress bar */}
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
          <svg className="w-6 h-6 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      {/* Lesson Progress */}
      {lessonInfo && (
        <Link
          href={`/guided-lesson?id=${lessonInfo.id}`}
          className="block mb-5 p-4 bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">{lessonInfo.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${lessonInfo.total > 0 ? (lessonInfo.completed / lessonInfo.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{lessonInfo.completed}/{lessonInfo.total}</span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Scenarios */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {SCENARIOS.map((s) => (
          <Link
            key={s.scenario}
            href={`/conversation?scenario=${s.scenario}`}
            className="p-4 bg-white rounded-2xl shadow-sm active:scale-95 transition-transform"
          >
            <span className="text-2xl block mb-1.5">{s.emoji}</span>
            <span className="text-sm font-semibold text-gray-800">{s.label}</span>
          </Link>
        ))}
      </div>

      {/* Due Review */}
      {dueCount > 0 && (
        <Link
          href="/flashcard"
          className="block mb-5 p-3.5 bg-amber-50 rounded-2xl active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <span className="text-amber-800 font-bold text-sm">復習待ち {dueCount}件</span>
            <span className="text-amber-500 font-bold">→</span>
          </div>
        </Link>
      )}

      {/* Skills */}
      <div className="grid grid-cols-5 gap-2">
        {SKILLS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="p-2.5 bg-white rounded-2xl text-center shadow-sm active:scale-90 transition-transform"
          >
            <span className="text-lg block">{s.icon}</span>
            <span className="text-[10px] text-gray-500 font-medium mt-0.5 block">{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
