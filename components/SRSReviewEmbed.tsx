"use client";

import { useState, useCallback } from "react";
import { calculateSRS, type SRSCard, type SRSQuality } from "@/lib/srs";
import { getAllCards, saveAllCards } from "@/lib/srs";
import { addXP } from "@/lib/xp";
import AudioPlayer from "@/components/AudioPlayer";

interface SRSReviewEmbedProps {
  cards: SRSCard[];
  onComplete: (reviewed: number, xpEarned: number) => void;
  // Optional: vocabulary lookup map
  vocabMap?: Record<string, { japanese: string; romanization: string }>;
}

export default function SRSReviewEmbed({ cards, onComplete, vocabMap }: SRSReviewEmbedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  const current = cards[currentIndex];
  const vocab = current && vocabMap ? vocabMap[current.key] : null;

  const handleRate = useCallback((quality: SRSQuality) => {
    if (!current) return;
    const allCards = getAllCards();
    const updated = calculateSRS(current, quality);
    allCards[current.key] = updated;
    saveAllCards(allCards);

    const xp = addXP("flashcardReview");
    const newReviewed = reviewed + 1;
    const newXP = xpEarned + xp;
    setReviewed(newReviewed);
    setXpEarned(newXP);
    setFlipped(false);

    if (currentIndex + 1 >= cards.length) {
      // Done
      onComplete(newReviewed, newXP);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }, [current, currentIndex, cards.length, reviewed, xpEarned, onComplete]);

  if (!current) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>復習するカードがありません</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">復習 {currentIndex + 1}/{cards.length}</span>
        <span className="text-xs text-amber-500 font-bold">⚡+{xpEarned}</span>
      </div>

      <div className="h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${((currentIndex) / cards.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div
        className="card-flip cursor-pointer mb-6"
        onClick={() => setFlipped(!flipped)}
      >
        <div className={`card-flip-inner relative h-48 ${flipped ? "flipped" : ""}`}>
          {/* Front — Persian word */}
          <div className="card-front absolute inset-0 bg-white rounded-2xl shadow-md flex flex-col items-center justify-center p-6 border border-gray-100">
            <p className="persian-text text-2xl font-bold text-gray-900 mb-2" dir="rtl">{current.key}</p>
            <AudioPlayer text={current.key} />
            <p className="text-xs text-gray-400 mt-3">タップで裏面を見る</p>
          </div>

          {/* Back — meaning */}
          <div className="card-back absolute inset-0 bg-emerald-50 rounded-2xl shadow-md flex flex-col items-center justify-center p-6 border border-emerald-100">
            {vocab ? (
              <>
                <p className="text-xl font-bold text-gray-900 mb-1">{vocab.japanese}</p>
                <p className="text-sm text-emerald-600">{vocab.romanization}</p>
              </>
            ) : (
              <p className="text-lg text-gray-600">{current.key}</p>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => handleRate(0)}
          className="py-3 rounded-xl bg-red-100 text-red-700 text-sm font-semibold active:scale-95 transition-transform">
          忘れた
        </button>
        <button onClick={() => handleRate(3)}
          className="py-3 rounded-xl bg-orange-100 text-orange-700 text-sm font-semibold active:scale-95 transition-transform">
          難しい
        </button>
        <button onClick={() => handleRate(4)}
          className="py-3 rounded-xl bg-blue-100 text-blue-700 text-sm font-semibold active:scale-95 transition-transform">
          良い
        </button>
        <button onClick={() => handleRate(5)}
          className="py-3 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-semibold active:scale-95 transition-transform">
          完璧
        </button>
      </div>
    </div>
  );
}
