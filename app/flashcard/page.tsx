"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMergedVocabulary } from "@/lib/use-merged-data";
import { getCEFRProgress, CEFR_LEVELS } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import { getAllCards, saveAllCards, calculateSRS, createNewCard, isDue, isMastered } from "@/lib/srs";
import type { SRSCard, SRSQuality } from "@/lib/srs";
import { addXP } from "@/lib/xp";
import PersianText from "@/components/PersianText";
import AudioPlayer from "@/components/AudioPlayer";

interface Toast {
  message: string;
  type: "success" | "info" | "warning" | "error";
  nextReview: string;
}

interface SessionStats {
  reviewed: number;
  correct: number;
  incorrect: number;
  newMastered: number;
  masteredWords: string[];
}

export default function FlashcardPage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const { items, categories } = useMergedVocabulary(level);
  const [selectedCategory, setSelectedCategory] = useState("全カテゴリ");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [srsCards, setSrsCards] = useState<Record<string, SRSCard>>({});
  const [reviewMode, setReviewMode] = useState(false);
  const touchStartX = useRef(0);

  // Toast state
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Session tracking
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    reviewed: 0, correct: 0, incorrect: 0, newMastered: 0, masteredWords: [],
  });
  const [showSummary, setShowSummary] = useState(false);
  const sessionStartRef = useRef(false);

  useEffect(() => {
    const progress = getCEFRProgress();
    setLevel(progress.currentLevel);
    setSrsCards(getAllCards());
  }, []);

  const filtered = items
    .filter((item) => selectedCategory === "全カテゴリ" || item.カテゴリー === selectedCategory)
    .filter((item) => {
      if (!reviewMode) return true;
      const card = srsCards[item.ペルシア語];
      return !card || isDue(card);
    });

  const current = filtered[currentIndex];

  const showToast = useCallback((t: Toast) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(t);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const formatInterval = (interval: number): string => {
    if (interval === 0) return "今日中にもう一度";
    if (interval === 1) return "明日復習";
    if (interval < 7) return `${interval}日後に復習`;
    if (interval < 30) return `${Math.round(interval / 7)}週間後に復習`;
    return `${Math.round(interval / 30)}ヶ月後に復習`;
  };

  const handleRate = useCallback(
    (quality: SRSQuality) => {
      if (!current) return;
      const key = current.ペルシア語;
      const existing = srsCards[key] || createNewCard(key);
      const wasMastered = isMastered(existing);
      const updated = calculateSRS(existing, quality);
      const next = { ...srsCards, [key]: updated };
      setSrsCards(next);
      saveAllCards(next);
      setFlipped(false);

      // Mark session as started
      sessionStartRef.current = true;
      addXP("flashcardReview");

      // Update session stats
      const isCorrect = quality >= 3;
      const nowMastered = isMastered(updated) && !wasMastered;
      setSessionStats((prev) => ({
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (isCorrect ? 0 : 1),
        newMastered: prev.newMastered + (nowMastered ? 1 : 0),
        masteredWords: nowMastered ? [...prev.masteredWords, current.日本語] : prev.masteredWords,
      }));

      // Show toast
      const toastConfig: Record<SRSQuality, { message: string; type: Toast["type"] }> = {
        0: { message: "忘れた", type: "error" },
        3: { message: "難しい", type: "warning" },
        4: { message: "良い！", type: "info" },
        5: { message: nowMastered ? "🎉 マスター！" : "完璧！", type: "success" },
      };
      const config = toastConfig[quality];
      showToast({
        message: config.message,
        type: config.type,
        nextReview: formatInterval(updated.interval),
      });

      // Advance to next card
      const nextIndex = currentIndex + 1;
      if (nextIndex >= filtered.length) {
        // All cards done in review mode → show summary
        if (reviewMode || nextIndex >= filtered.length) {
          setTimeout(() => {
            if (sessionStartRef.current && sessionStats.reviewed + 1 >= 3) {
              setShowSummary(true);
            }
          }, 1500);
        }
        setCurrentIndex(0);
      } else {
        setCurrentIndex(nextIndex);
      }
    },
    [current, srsCards, filtered.length, currentIndex, reviewMode, showToast, sessionStats.reviewed]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 80) {
      if (diff > 0) handleRate(4);
      else handleRate(0);
    }
  };

  const masteredCount = filtered.filter(
    (i) => srsCards[i.ペルシア語] && srsCards[i.ペルシア語].repetitions >= 3
  ).length;

  const dueCount = filtered.filter((i) => {
    const card = srsCards[i.ペルシア語];
    return !card || isDue(card);
  }).length;

  const resetSession = () => {
    setSessionStats({ reviewed: 0, correct: 0, incorrect: 0, newMastered: 0, masteredWords: [] });
    setShowSummary(false);
    sessionStartRef.current = false;
  };

  // Manually show summary
  const handleFinishSession = () => {
    if (sessionStats.reviewed > 0) {
      setShowSummary(true);
    }
  };

  if (!items.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  // Session Summary Screen
  if (showSummary) {
    const accuracy = sessionStats.reviewed > 0
      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
      : 0;

    return (
      <div className="px-4 pt-6 pb-24">
        <h1 className="text-xl font-bold text-gray-900 text-center mb-6">セッション結果</h1>

        {/* Score circle */}
        <div className="flex justify-center mb-6">
          <div className="relative w-28 h-28">
            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none"
                stroke={accuracy >= 80 ? "#22c55e" : accuracy >= 50 ? "#eab308" : "#ef4444"}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(accuracy / 100) * 314} 314`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${
                accuracy >= 80 ? "text-green-500" : accuracy >= 50 ? "text-yellow-500" : "text-red-500"
              }`}>{accuracy}%</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-900">{sessionStats.reviewed}</p>
            <p className="text-xs text-gray-500">学習枚数</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-emerald-600">{sessionStats.correct}</p>
            <p className="text-xs text-gray-500">正解（難しい以上）</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-red-500">{sessionStats.incorrect}</p>
            <p className="text-xs text-gray-500">忘れた</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-purple-600">{sessionStats.newMastered}</p>
            <p className="text-xs text-gray-500">新マスター</p>
          </div>
        </div>

        {/* Newly mastered words */}
        {sessionStats.masteredWords.length > 0 && (
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 mb-6">
            <p className="text-sm font-semibold text-emerald-700 mb-2">🎉 新しくマスターした単語</p>
            <div className="flex flex-wrap gap-2">
              {sessionStats.masteredWords.map((word, i) => (
                <span key={i} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Encouragement message */}
        <div className="text-center mb-6">
          <p className="text-lg">
            {accuracy >= 80 ? "🌟 すばらしい！" :
             accuracy >= 50 ? "👍 いい調子！" :
             "💪 続けよう！"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {dueCount > 0 ? `まだ${dueCount}語が復習待ちです` : "今日の復習は完了です！"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => { resetSession(); setReviewMode(true); setCurrentIndex(0); }}
            className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
            disabled={dueCount === 0}>
            {dueCount > 0 ? `復習を続ける (${dueCount})` : "復習完了！"}
          </button>
          <button onClick={resetSession}
            className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
            カード学習に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 relative">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg border animate-slide-in ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
          toast.type === "info" ? "bg-blue-50 border-blue-200 text-blue-700" :
          toast.type === "warning" ? "bg-orange-50 border-orange-200 text-orange-700" :
          "bg-red-50 border-red-200 text-red-700"
        }`}>
          <p className="font-semibold text-sm">{toast.message}</p>
          <p className="text-xs opacity-75 mt-0.5">{toast.nextReview}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">フラッシュカード</h1>
        {sessionStats.reviewed > 0 && (
          <button onClick={handleFinishSession}
            className="text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors">
            結果を見る ({sessionStats.reviewed}枚)
          </button>
        )}
      </div>

      {/* Level + Review Toggle */}
      <div className="flex gap-2 mb-3">
        <select
          value={level}
          onChange={(e) => {
            setLevel(e.target.value as CEFRLevel);
            setCurrentIndex(0);
            setFlipped(false);
          }}
          className="flex-1 p-2 rounded-lg border border-gray-200 bg-white text-sm"
        >
          {CEFR_LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <button
          onClick={() => { setReviewMode(!reviewMode); setCurrentIndex(0); setFlipped(false); }}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            reviewMode ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          復習 {dueCount > 0 && `(${dueCount})`}
        </button>
      </div>

      <select
        value={selectedCategory}
        onChange={(e) => {
          setSelectedCategory(e.target.value);
          setCurrentIndex(0);
          setFlipped(false);
        }}
        className="w-full p-2 rounded-lg border border-gray-200 bg-white mb-3 text-sm text-gray-700"
      >
        <option>全カテゴリ</option>
        {categories.map((cat) => (
          <option key={cat}>{cat}</option>
        ))}
      </select>

      <div className="text-sm text-gray-500 mb-2 flex justify-between">
        <span>{filtered.length > 0 ? `${currentIndex + 1} / ${filtered.length}` : "0 / 0"}</span>
        <span className="text-emerald-600">マスター: {masteredCount} / {filtered.length}</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
        <div
          className="bg-emerald-500 h-1.5 rounded-full transition-all"
          style={{ width: `${(masteredCount / Math.max(filtered.length, 1)) * 100}%` }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {reviewMode ? "復習待ちのカードはありません" : "このレベル・カテゴリにカードがありません"}
        </div>
      ) : current && (
        <>
          <div
            className="card-flip cursor-pointer"
            onClick={() => setFlipped(!flipped)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className={`card-flip-inner relative h-64 ${flipped ? "flipped" : ""}`}>
              <div className="card-front absolute inset-0 bg-white rounded-2xl shadow-md flex flex-col items-center justify-center p-6 border border-gray-100">
                <div className="absolute top-3 left-3 text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  {current.レベル}
                </div>
                {/* SRS status badge */}
                {srsCards[current.ペルシア語] && (
                  <div className="absolute top-3 right-3">
                    {isMastered(srsCards[current.ペルシア語]) ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500 text-white">マスター済</span>
                    ) : srsCards[current.ペルシア語].repetitions > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-600">学習中</span>
                    ) : null}
                  </div>
                )}
                <PersianText size="2xl" className="mb-4 text-gray-900">
                  {current.ペルシア語}
                </PersianText>
                <AudioPlayer text={current.ペルシア語} />
                <p className="text-xs text-gray-400 mt-4">タップで裏面を見る</p>
              </div>

              <div className="card-back absolute inset-0 bg-emerald-50 rounded-2xl shadow-md flex flex-col items-center justify-center p-6 border border-emerald-100">
                <p className="text-2xl font-bold text-gray-900 mb-2">{current.日本語}</p>
                <p className="text-lg text-gray-600 mb-1">{current.英語}</p>
                <p className="text-sm text-emerald-600 mb-1">{current.ローマ字}</p>
                {current.備考 && <p className="text-xs text-gray-400 mt-2">{current.備考}</p>}
                <div className="mt-3">
                  <AudioPlayer text={current.ペルシア語} />
                </div>
              </div>
            </div>
          </div>

          {/* SRS 4-button rating */}
          <div className="grid grid-cols-4 gap-2 mt-6">
            <button
              onClick={() => handleRate(0)}
              className="py-3 rounded-xl bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition-colors"
            >
              忘れた
            </button>
            <button
              onClick={() => handleRate(3)}
              className="py-3 rounded-xl bg-orange-100 text-orange-700 text-sm font-semibold hover:bg-orange-200 transition-colors"
            >
              難しい
            </button>
            <button
              onClick={() => handleRate(4)}
              className="py-3 rounded-xl bg-blue-100 text-blue-700 text-sm font-semibold hover:bg-blue-200 transition-colors"
            >
              良い
            </button>
            <button
              onClick={() => handleRate(5)}
              className="py-3 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-semibold hover:bg-emerald-200 transition-colors"
            >
              完璧
            </button>
          </div>

          {/* Session indicator */}
          {sessionStats.reviewed > 0 && (
            <div className="mt-4 text-center text-xs text-gray-400">
              今回: {sessionStats.reviewed}枚学習 / 正解率 {sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0}%
              {sessionStats.newMastered > 0 && (
                <span className="text-emerald-500 ml-2">+{sessionStats.newMastered} マスター</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
