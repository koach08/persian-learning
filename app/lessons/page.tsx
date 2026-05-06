"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getLessonsByLevel, getLessonProgress, type Lesson, type LessonProgress } from "@/lib/guided-lessons";
import { getCEFRProgress, CEFR_LEVELS, CEFR_LABELS } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import BackButton from "@/components/BackButton";

export default function LessonsPage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [unlocked, setUnlocked] = useState<CEFRLevel[]>(["A1"]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});

  useEffect(() => {
    const p = getCEFRProgress();
    setLevel(p.currentLevel);
    setUnlocked(p.unlockedLevels);
    setLessons(getLessonsByLevel(p.currentLevel));
    setProgress(getLessonProgress());
  }, []);

  const handleLevelChange = (l: CEFRLevel) => {
    setLevel(l);
    setLessons(getLessonsByLevel(l));
  };

  const completedCount = lessons.filter((l) => progress[l.id]?.completed).length;
  const nextLessonIndex = lessons.findIndex((l) => !progress[l.id]?.completed);

  return (
    <div className="px-4 pt-6 pb-24">
      <BackButton href="/" label="ホーム" />
      <h1 className="text-2xl font-black text-gray-900 mb-1">レッスン一覧</h1>
      <p className="text-sm text-gray-500 mb-5">レベル別の学習パス</p>

      {/* Level tabs */}
      <div className="flex gap-1.5 mb-5">
        {CEFR_LEVELS.map((l) => {
          const isUnlocked = unlocked.includes(l);
          const isActive = level === l;
          return (
            <button
              key={l}
              onClick={() => isUnlocked && handleLevelChange(l)}
              disabled={!isUnlocked}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                  : isUnlocked
                    ? "bg-white text-gray-600 border border-gray-200"
                    : "bg-gray-100 text-gray-300"
              }`}
            >
              {l}
            </button>
          );
        })}
      </div>

      {/* Level summary */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-emerald-700">{level} {CEFR_LABELS[level]}</p>
          <p className="text-sm font-bold text-emerald-600">{completedCount}/{lessons.length}</p>
        </div>
        <div className="h-2 bg-white rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Lesson path */}
      <div className="space-y-3">
        {lessons.map((lesson, index) => {
          const isCompleted = progress[lesson.id]?.completed;
          const isCurrent = index === nextLessonIndex;
          const isLocked = nextLessonIndex !== -1 && index > nextLessonIndex;
          const speakSteps = lesson.steps.filter((s) => s.type === "speak" || s.type === "speak-cloze").length;

          return (
            <div key={lesson.id} className="flex items-stretch gap-3">
              {/* Path indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-purple-500 text-white ring-4 ring-purple-100"
                      : "bg-gray-200 text-gray-400"
                }`}>
                  {isCompleted ? "✓" : index + 1}
                </div>
                {index < lessons.length - 1 && (
                  <div className={`flex-1 w-0.5 my-1 ${isCompleted ? "bg-emerald-300" : "bg-gray-200"}`} />
                )}
              </div>

              {/* Lesson card */}
              {isLocked ? (
                <div className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-100 opacity-60">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-400">🔒</span>
                    <p className="font-bold text-gray-400 text-sm">{lesson.title}</p>
                  </div>
                  <p className="text-xs text-gray-400">前のレッスンを完了すると解放</p>
                </div>
              ) : (
                <Link
                  href={`/guided-lesson?id=${lesson.id}`}
                  className={`flex-1 block rounded-2xl p-4 border transition-all active:scale-[0.98] ${
                    isCurrent
                      ? "bg-white border-purple-200 shadow-md"
                      : isCompleted
                        ? "bg-white border-emerald-100"
                        : "bg-white border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-gray-900 text-sm">{lesson.title}</p>
                    {isCurrent && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">次へ</span>
                    )}
                    {isCompleted && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">完了</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500" dir="rtl">{lesson.titlePersian}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>🗣️ {speakSteps}フレーズ</span>
                    <span>📝 {lesson.steps.length}ステップ</span>
                  </div>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
