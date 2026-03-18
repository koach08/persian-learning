"use client";

import { useState, useEffect, useMemo } from "react";
import { useMergedVocabulary } from "@/lib/use-merged-data";
import { getAllCards } from "@/lib/srs";
import type { SRSCard } from "@/lib/srs";
import { getCEFRProgress, getLevelMasteryStats, CEFR_LEVELS, CEFR_LABELS } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import { getStreak } from "@/lib/streak";
import { getLevelLessonStats } from "@/lib/guided-lessons";

const LEVEL_COLORS: Record<CEFRLevel, { bg: string; bar: string; text: string }> = {
  A1: { bg: "bg-emerald-50", bar: "bg-emerald-500", text: "text-emerald-700" },
  A2: { bg: "bg-blue-50", bar: "bg-blue-500", text: "text-blue-700" },
  B1: { bg: "bg-purple-50", bar: "bg-purple-500", text: "text-purple-700" },
  B2: { bg: "bg-orange-50", bar: "bg-orange-500", text: "text-orange-700" },
  C1: { bg: "bg-rose-50", bar: "bg-rose-500", text: "text-rose-700" },
  C2: { bg: "bg-amber-50", bar: "bg-amber-500", text: "text-amber-700" },
};

// Simple heatmap for last 7 days
function getRecentDates(): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function getStudyDates(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("persian-streak");
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    return new Set(data.dates || []);
  } catch {
    return new Set();
  }
}

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default function DashboardPage() {
  const { wordsByLevel } = useMergedVocabulary();
  const [cards, setCards] = useState<Record<string, SRSCard>>({});
  const [currentLevel, setCurrentLevel] = useState<CEFRLevel>("A1");
  const [streak, setStreak] = useState(0);
  const [studyDates, setStudyDates] = useState<Set<string>>(new Set());
  const [lessonStats, setLessonStats] = useState<Record<CEFRLevel, { completed: number; total: number }> | null>(null);

  useEffect(() => {
    setCards(getAllCards());
    setCurrentLevel(getCEFRProgress().currentLevel);
    setStreak(getStreak());
    setStudyDates(getStudyDates());
    // Lesson stats per level
    const ls: Record<string, { completed: number; total: number }> = {};
    for (const level of CEFR_LEVELS) {
      ls[level] = getLevelLessonStats(level);
    }
    setLessonStats(ls as Record<CEFRLevel, { completed: number; total: number }>);
  }, []);

  const stats = useMemo(() => {
    if (Object.keys(wordsByLevel).length === 0) return null;
    return getLevelMasteryStats(cards, wordsByLevel);
  }, [cards, wordsByLevel]);

  const totalWords = stats ? Object.values(stats).reduce((a, s) => a + s.total, 0) : 0;
  const totalMastered = stats ? Object.values(stats).reduce((a, s) => a + s.mastered, 0) : 0;
  const totalDue = stats ? Object.values(stats).reduce((a, s) => a + s.due, 0) : 0;
  const totalStudied = Object.keys(cards).length;

  // Next level goal
  const nextLevelInfo = useMemo(() => {
    if (!stats) return null;
    const idx = CEFR_LEVELS.indexOf(currentLevel);
    if (idx >= CEFR_LEVELS.length - 1) return null;
    const nextLevel = CEFR_LEVELS[idx + 1];
    const currentStats = stats[currentLevel];
    const needed = Math.ceil(currentStats.total * 0.8);
    const remaining = Math.max(0, needed - currentStats.mastered);
    return { nextLevel, remaining, needed, current: currentStats.mastered };
  }, [stats, currentLevel]);

  // Recent week heatmap
  const recentDates = useMemo(() => getRecentDates(), []);

  // Practice balance (estimated from localStorage keys)
  const skillBalance = useMemo(() => {
    if (typeof window === "undefined") return null;
    const convo = JSON.parse(localStorage.getItem("conversation-practice-results") || "[]").length;
    const listening = JSON.parse(localStorage.getItem("listening-history") || "[]").length;
    const srsCount = Object.keys(cards).length;
    const lessonCount = Object.values(getLessonStatsFromStorage()).filter(Boolean).length;
    return {
      speaking: convo + lessonCount,
      listening,
      reading: srsCount,
      writing: 0,
    };
  }, [cards]);

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-900 mb-4">学習ダッシュボード</h1>

      {/* Streak & Heatmap */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-2xl font-bold text-gray-900">{streak}日</p>
              <p className="text-xs text-gray-500">連続学習</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-700">{currentLevel}</p>
            <p className="text-xs text-gray-400">{CEFR_LABELS[currentLevel]}</p>
          </div>
        </div>
        {/* Week heatmap */}
        <div className="flex gap-1 justify-between">
          {recentDates.map((date) => {
            const active = studyDates.has(date);
            const dayIdx = new Date(date).getDay();
            return (
              <div key={date} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400">{DAY_LABELS[dayIdx]}</span>
                <div className={`w-7 h-7 rounded-md ${active ? "bg-emerald-500" : "bg-gray-100"}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalStudied}</p>
          <p className="text-xs text-gray-500">学習済み</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-emerald-600">{totalMastered}</p>
          <p className="text-xs text-gray-500">マスター</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-amber-600">{totalDue}</p>
          <p className="text-xs text-gray-500">復習待ち</p>
        </div>
      </div>

      {/* 4-skill balance */}
      {skillBalance && (
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">4技能バランス</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "話す", value: skillBalance.speaking, color: "bg-purple-500", icon: "🗣️" },
              { label: "聞く", value: skillBalance.listening, color: "bg-teal-500", icon: "👂" },
              { label: "読む", value: skillBalance.reading, color: "bg-blue-500", icon: "📖" },
              { label: "書く", value: skillBalance.writing, color: "bg-amber-500", icon: "✍️" },
            ].map((s) => {
              const max = Math.max(skillBalance.speaking, skillBalance.listening, skillBalance.reading, skillBalance.writing, 1);
              const pct = Math.round((s.value / max) * 100);
              return (
                <div key={s.label} className="text-center">
                  <span className="text-lg">{s.icon}</span>
                  <div className="h-16 flex items-end justify-center mb-1">
                    <div className={`w-6 rounded-t ${s.color} transition-all`} style={{ height: `${Math.max(pct, 5)}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                  <p className="text-xs font-semibold text-gray-700">{s.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next goal */}
      {nextLevelInfo && nextLevelInfo.remaining > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100 mb-4">
          <p className="text-sm font-semibold text-purple-700 mb-1">次の目標</p>
          <p className="text-gray-700">
            あと<span className="font-bold text-purple-600">{nextLevelInfo.remaining}語</span>マスターで{nextLevelInfo.nextLevel}レベルへ！
          </p>
          <div className="mt-2 h-2 bg-purple-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${nextLevelInfo.needed > 0 ? (nextLevelInfo.current / nextLevelInfo.needed) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Per-level mastery */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">レベル別マスター率</p>
        <div className="space-y-3">
          {stats && CEFR_LEVELS.map((level) => {
            const s = stats[level];
            const pct = s.total > 0 ? Math.round((s.mastered / s.total) * 100) : 0;
            const colors = LEVEL_COLORS[level];
            const ls = lessonStats?.[level];
            return (
              <div key={level}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${colors.text}`}>{level}</span>
                    <span className="text-xs text-gray-400">{CEFR_LABELS[level]}</span>
                  </div>
                  <span className="text-xs text-gray-500">{s.mastered}/{s.total} ({pct}%)</span>
                </div>
                <div className={`h-2.5 rounded-full ${colors.bg}`}>
                  <div className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                    style={{ width: `${pct}%` }} />
                </div>
                <div className="flex gap-3 mt-0.5">
                  {s.due > 0 && (
                    <p className="text-xs text-amber-600">{s.due}語が復習待ち</p>
                  )}
                  {ls && ls.total > 0 && (
                    <p className="text-xs text-gray-400">レッスン: {ls.completed}/{ls.total}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
        <p className="text-sm font-semibold text-gray-700 mb-3">全体の進捗</p>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">全{totalWords}語中 {totalMastered}語マスター</span>
          <span className="text-xs text-gray-500">{totalWords > 0 ? Math.round((totalMastered / totalWords) * 100) : 0}%</span>
        </div>
        <div className="h-3 rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
            style={{ width: `${totalWords > 0 ? (totalMastered / totalWords) * 100 : 0}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          マスター = SRSで3回以上正解した単語
        </p>
      </div>
    </div>
  );
}

// Helper to get lesson progress from localStorage
function getLessonStatsFromStorage(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("guided-lesson-progress");
    if (!raw) return {};
    const data = JSON.parse(raw);
    const result: Record<string, boolean> = {};
    for (const [id, info] of Object.entries(data)) {
      result[id] = (info as { completed: boolean }).completed;
    }
    return result;
  } catch {
    return {};
  }
}
