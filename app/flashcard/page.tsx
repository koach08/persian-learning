"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { loadVocabulary, VocabularyItem } from "@/lib/data-loader";
import PersianText from "@/components/PersianText";
import AudioPlayer from "@/components/AudioPlayer";

interface CardProgress {
  [key: string]: "known" | "again";
}

export default function FlashcardPage() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("全カテゴリ");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState<CardProgress>({});
  const touchStartX = useRef(0);

  useEffect(() => {
    loadVocabulary().then((data) => {
      setItems(data);
      const cats = [...new Set(data.map((d) => d.カテゴリー))];
      setCategories(cats);
    });
    const saved = localStorage.getItem("flashcard-progress");
    if (saved) setProgress(JSON.parse(saved));
  }, []);

  const filtered = items.filter(
    (item) => selectedCategory === "全カテゴリ" || item.カテゴリー === selectedCategory
  );

  const current = filtered[currentIndex];

  const saveProgress = useCallback(
    (key: string, status: "known" | "again") => {
      const next = { ...progress, [key]: status };
      setProgress(next);
      localStorage.setItem("flashcard-progress", JSON.stringify(next));
    },
    [progress]
  );

  const nextCard = useCallback(() => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
  }, [filtered.length]);

  const handleKnown = () => {
    if (current) saveProgress(current.ペルシア語, "known");
    nextCard();
  };

  const handleAgain = () => {
    if (current) saveProgress(current.ペルシア語, "again");
    nextCard();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 80) {
      if (diff > 0) handleKnown();
      else handleAgain();
    }
  };

  const knownCount = filtered.filter((i) => progress[i.ペルシア語] === "known").length;

  if (!items.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">フラッシュカード</h1>

      <select
        value={selectedCategory}
        onChange={(e) => {
          setSelectedCategory(e.target.value);
          setCurrentIndex(0);
          setFlipped(false);
        }}
        className="w-full p-3 rounded-lg border border-gray-200 bg-white mb-4 text-gray-700"
      >
        <option>全カテゴリ</option>
        {categories.map((cat) => (
          <option key={cat}>{cat}</option>
        ))}
      </select>

      <div className="text-sm text-gray-500 mb-2 flex justify-between">
        <span>
          {currentIndex + 1} / {filtered.length}
        </span>
        <span className="text-emerald-600">
          覚えた: {knownCount} / {filtered.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
        <div
          className="bg-emerald-500 h-1.5 rounded-full transition-all"
          style={{ width: `${(knownCount / Math.max(filtered.length, 1)) * 100}%` }}
        />
      </div>

      {current && (
        <>
          <div
            className="card-flip cursor-pointer"
            onClick={() => setFlipped(!flipped)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className={`card-flip-inner relative h-64 ${flipped ? "flipped" : ""}`}>
              {/* Front */}
              <div className="card-front absolute inset-0 bg-white rounded-2xl shadow-md flex flex-col items-center justify-center p-6 border border-gray-100">
                <PersianText size="2xl" className="mb-4 text-gray-900">
                  {current.ペルシア語}
                </PersianText>
                <AudioPlayer text={current.ペルシア語} />
                <p className="text-xs text-gray-400 mt-4">タップで裏面を見る</p>
              </div>

              {/* Back */}
              <div className="card-back absolute inset-0 bg-emerald-50 rounded-2xl shadow-md flex flex-col items-center justify-center p-6 border border-emerald-100">
                <p className="text-2xl font-bold text-gray-900 mb-2">{current.日本語}</p>
                <p className="text-lg text-gray-600 mb-1">{current.英語}</p>
                <p className="text-sm text-emerald-600 mb-1">{current.ローマ字}</p>
                {current.備考 && (
                  <p className="text-xs text-gray-400 mt-2">{current.備考}</p>
                )}
                <div className="mt-3">
                  <AudioPlayer text={current.ペルシア語} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleAgain}
              className="flex-1 py-3 rounded-xl bg-orange-100 text-orange-700 font-semibold hover:bg-orange-200 transition-colors"
            >
              もう一度
            </button>
            <button
              onClick={handleKnown}
              className="flex-1 py-3 rounded-xl bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200 transition-colors"
            >
              知ってる
            </button>
          </div>
        </>
      )}
    </div>
  );
}
