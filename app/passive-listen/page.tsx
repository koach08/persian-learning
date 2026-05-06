"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getCEFRProgress, CEFR_LEVELS } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import { getAllCards, isDue } from "@/lib/srs";
import { useTTS } from "@/lib/use-tts";
import { addXP } from "@/lib/xp";
import { recordActivity } from "@/lib/streak";
import Link from "next/link";

// Quick phrases per level (reuse from today-session concept)
const PHRASES: Record<CEFRLevel, { persian: string; japanese: string }[]> = {
  A1: [
    { persian: "سلام حالت چطوره؟", japanese: "元気？" },
    { persian: "ممنون خوبم", japanese: "ありがとう、元気だよ" },
    { persian: "اسمت چیه؟", japanese: "名前は？" },
    { persian: "خداحافظ", japanese: "さようなら" },
    { persian: "لطفاً", japanese: "お願いします" },
    { persian: "ممنون", japanese: "ありがとう" },
    { persian: "بله", japanese: "はい" },
    { persian: "نه", japanese: "いいえ" },
    { persian: "چقدر؟", japanese: "いくら？" },
    { persian: "کجا؟", japanese: "どこ？" },
  ],
  A2: [
    { persian: "ببخشید یه سوال دارم", japanese: "すみません、質問があります" },
    { persian: "می‌تونم کمکتون کنم؟", japanese: "お手伝いできますか？" },
    { persian: "چقدر می‌شه؟", japanese: "いくらですか？" },
    { persian: "فردا وقت داری؟", japanese: "明日時間ある？" },
    { persian: "هوا خوبه", japanese: "いい天気だね" },
  ],
  B1: [
    { persian: "به نظرم این ایده خوبیه", japanese: "いいアイデアだと思う" },
    { persian: "موافقم ولی یه مشکلی هست", japanese: "賛成だけど問題がある" },
    { persian: "می‌خوام درباره‌ش صحبت کنیم", japanese: "それについて話したい" },
  ],
  B2: [
    { persian: "از دیدگاه من این موضوع پیچیده‌ست", japanese: "私の見方ではこの問題は複雑だ" },
    { persian: "تحقیقات نشون می‌ده که", japanese: "研究によると" },
  ],
  C1: [
    { persian: "با توجه به شرایط فعلی باید استراتژی‌مون رو تغییر بدیم", japanese: "現状を踏まえて戦略を変えるべきだ" },
  ],
  C2: [
    { persian: "ماهیت این مسئله فراتر از یه بحث صرفاً نظری‌ست", japanese: "この問題の本質は純粋に理論的な議論を超えている" },
  ],
};

export default function PassiveListenPage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState<{ persian: string; japanese: string }[]>([]);
  const [showJapanese, setShowJapanese] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(false);
  const { play: playTTS, unlock } = useTTS();

  useEffect(() => {
    const l = getCEFRProgress().currentLevel;
    setLevel(l);
    buildPlaylist(l);
  }, []);

  const buildPlaylist = (lvl: CEFRLevel) => {
    // Combine SRS due cards + level phrases
    const cards = getAllCards();
    const dueKeys = Object.values(cards).filter(isDue).map((c) => c.key).slice(0, 10);
    const srsItems = dueKeys.map((k) => ({ persian: k, japanese: "" }));
    const phraseItems = PHRASES[lvl] || PHRASES.A1;
    // Interleave: SRS first, then phrases
    const combined = [...srsItems, ...phraseItems];
    setItems(combined);
    setCurrentIndex(0);
  };

  const playNext = useCallback(async (idx: number, list: { persian: string; japanese: string }[]) => {
    if (!playingRef.current || idx >= list.length) {
      setPlaying(false);
      playingRef.current = false;
      if (idx >= list.length) {
        recordActivity();
        addXP("sessionComplete");
      }
      return;
    }

    setCurrentIndex(idx);
    setShowJapanese(false);

    // Play Persian
    try {
      await playTTS(list[idx].persian);
    } catch { /* TTS error — continue */ }

    if (!playingRef.current) return;

    // Pause, show Japanese
    timerRef.current = setTimeout(() => {
      if (!playingRef.current) return;
      setShowJapanese(true);

      // Speak Japanese with browser TTS
      if (list[idx].japanese && typeof speechSynthesis !== "undefined") {
        const utt = new SpeechSynthesisUtterance(list[idx].japanese);
        utt.lang = "ja-JP";
        utt.rate = 0.9;
        speechSynthesis.speak(utt);
      }

      // Wait then move to next
      timerRef.current = setTimeout(() => {
        if (playingRef.current) {
          playNext(idx + 1, list);
        }
      }, 2500);
    }, 1500);
  }, [playTTS]);

  const togglePlay = () => {
    unlock();
    if (playing) {
      setPlaying(false);
      playingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      speechSynthesis?.cancel();
    } else {
      setPlaying(true);
      playingRef.current = true;
      playNext(currentIndex, items);
    }
  };

  const handleLevelChange = (l: CEFRLevel) => {
    setLevel(l);
    setPlaying(false);
    playingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    buildPlaylist(l);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      playingRef.current = false;
    };
  }, []);

  const current = items[currentIndex];

  return (
    <div className="px-4 pt-6 pb-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-teal-500 mb-4">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        ホーム
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-1">聞き流しモード</h1>
      <p className="text-sm text-gray-500 mb-6">ペルシア語 → 日本語の順に自動再生します</p>

      {/* Level selector */}
      <div className="flex gap-1.5 mb-6">
        {CEFR_LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => handleLevelChange(l)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              level === l ? "bg-teal-500 text-white shadow-md" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Current phrase display */}
      <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 mb-8 min-h-[200px] flex flex-col items-center justify-center">
        {current ? (
          <>
            <p className="text-2xl font-bold text-gray-900 text-center leading-relaxed" dir="rtl" style={{ fontFamily: "var(--font-vazirmatn)" }}>
              {current.persian}
            </p>
            {showJapanese && current.japanese && (
              <p className="text-lg text-gray-500 mt-4 animate-fade-in">{current.japanese}</p>
            )}
          </>
        ) : (
          <p className="text-gray-400">再生ボタンを押してスタート</p>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">{currentIndex + 1} / {items.length}</span>
        <div className="flex-1 mx-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Play/Pause button */}
      <div className="flex justify-center">
        <button
          onClick={togglePlay}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${
            playing
              ? "bg-gray-800 text-white scale-110"
              : "bg-teal-500 text-white hover:bg-teal-600"
          }`}
        >
          {playing ? (
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
