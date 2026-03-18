"use client";

import { useState, useEffect, useCallback } from "react";
import { getCEFRProgress } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import {
  getMinimalPairsByLevel,
  getMinimalPairsProgress,
  saveMinimalPairsProgress,
  type MinimalPair,
  type MinimalPairsProgress,
} from "@/lib/minimal-pairs-data";
import PersianText from "@/components/PersianText";
import { apiUrl } from "@/lib/api-config";

type Phase = "select" | "quiz" | "result";

export default function MinimalPairsPage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [phase, setPhase] = useState<Phase>("select");
  const [pairs, setPairs] = useState<MinimalPair[]>([]);
  const [currentPair, setCurrentPair] = useState<MinimalPair | null>(null);
  const [targetWord, setTargetWord] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<1 | 2 | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [questionCount, setQuestionCount] = useState(0);
  const [progress, setProgress] = useState<MinimalPairsProgress>({ scores: {} });

  useEffect(() => {
    const l = getCEFRProgress().currentLevel;
    setLevel(l);
    setProgress(getMinimalPairsProgress());
  }, []);

  const startQuiz = useCallback(
    (l?: CEFRLevel) => {
      const targetLevel = l || level;
      const available = getMinimalPairsByLevel(targetLevel);
      if (available.length === 0) return;
      setPairs(available);
      setScore({ correct: 0, total: 0 });
      setQuestionCount(0);
      pickRandomPair(available);
      setPhase("quiz");
    },
    [level]
  );

  const pickRandomPair = (pairsPool: MinimalPair[]) => {
    const pair = pairsPool[Math.floor(Math.random() * pairsPool.length)];
    setCurrentPair(pair);
    setTargetWord(Math.random() > 0.5 ? 1 : 2);
    setSelected(null);
    setShowResult(false);
    setQuestionCount((c) => c + 1);
  };

  const playTargetAudio = async () => {
    if (!currentPair || isPlaying) return;
    const word = targetWord === 1 ? currentPair.word1 : currentPair.word2;
    setIsPlaying(true);
    try {
      const res = await fetch(apiUrl("/api/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: word.persian }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const playWord = async (wordNum: 1 | 2) => {
    if (!currentPair || isPlaying) return;
    const word = wordNum === 1 ? currentPair.word1 : currentPair.word2;
    setIsPlaying(true);
    try {
      const res = await fetch(apiUrl("/api/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: word.persian }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const checkAnswer = (choice: 1 | 2) => {
    setSelected(choice);
    setShowResult(true);
    const isCorrect = choice === targetWord;
    setScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));
  };

  const nextQuestion = () => {
    if (questionCount >= 10) {
      // Save progress
      const newProgress = { ...progress };
      const key = level;
      const existing = newProgress.scores[key] || { correct: 0, total: 0 };
      newProgress.scores[key] = {
        correct: existing.correct + score.correct,
        total: existing.total + score.total,
      };
      setProgress(newProgress);
      saveMinimalPairsProgress(newProgress);
      setPhase("result");
    } else {
      pickRandomPair(pairs);
    }
  };

  // ── Select Phase ──
  if (phase === "select") {
    return (
      <div className="px-4 pt-6 pb-8">
        <h1 className="text-xl font-bold text-gray-900 mb-2">ミニマルペア</h1>
        <p className="text-sm text-gray-500 mb-4">似た音のペルシア語を聞き分けて、音の弁別力を鍛えよう</p>

        {/* Level tabs */}
        <div className="flex gap-2 mb-6">
          {(["A1", "A2", "B1", "B2"] as CEFRLevel[]).map((l) => {
            const count = getMinimalPairsByLevel(l).length;
            const levelScore = progress.scores[l];
            const pct = levelScore ? Math.round((levelScore.correct / levelScore.total) * 100) : null;
            return (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  level === l ? "bg-rose-500 text-white shadow-md" : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                <span>{l}</span>
                {pct !== null && <span className="block text-xs opacity-80">{pct}%</span>}
                <span className="block text-xs opacity-60">{count}組</span>
              </button>
            );
          })}
        </div>

        {/* Pairs preview */}
        <p className="text-xs text-gray-400 font-medium mb-2">── 音の対比 ──</p>
        <div className="space-y-2 mb-6">
          {getMinimalPairsByLevel(level).map((pair) => (
            <div key={pair.id} className="p-3 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                  {pair.soundContrast}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center">
                  <PersianText size="lg" className="text-gray-900">
                    {pair.word1.persian}
                  </PersianText>
                  <p className="text-xs text-gray-500">{pair.word1.romanization}</p>
                  <p className="text-xs text-gray-400">{pair.word1.japanese}</p>
                </div>
                <span className="text-gray-300 text-lg">vs</span>
                <div className="flex-1 text-center">
                  <PersianText size="lg" className="text-gray-900">
                    {pair.word2.persian}
                  </PersianText>
                  <p className="text-xs text-gray-500">{pair.word2.romanization}</p>
                  <p className="text-xs text-gray-400">{pair.word2.japanese}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">{pair.contrastDescription}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => startQuiz()}
          disabled={getMinimalPairsByLevel(level).length === 0}
          className="w-full py-3 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50"
        >
          聞き分けテスト (10問)
        </button>
      </div>
    );
  }

  // ── Quiz Phase ──
  if (phase === "quiz" && currentPair) {
    return (
      <div className="px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setPhase("select")} className="text-sm text-rose-500">
            ← 戻る
          </button>
          <span className="text-sm text-gray-500">
            {questionCount}/10
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-full transition-all"
            style={{ width: `${(questionCount / 10) * 100}%` }}
          />
        </div>

        {/* Sound contrast badge */}
        <div className="text-center mb-4">
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-medium">
            {currentPair.soundContrast}
          </span>
        </div>

        {/* Play button */}
        <div className="text-center mb-8">
          <button
            onClick={playTargetAudio}
            disabled={isPlaying}
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all ${
              isPlaying
                ? "bg-rose-200 text-rose-600 animate-pulse"
                : "bg-rose-500 text-white hover:bg-rose-600 shadow-lg active:scale-95"
            }`}
          >
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <p className="text-sm text-gray-500 mt-2">タップして音声を再生</p>
        </div>

        {/* Choices */}
        <p className="text-xs text-gray-400 font-medium mb-2 text-center">どちらの単語が聞こえましたか？</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[1, 2].map((n) => {
            const word = n === 1 ? currentPair.word1 : currentPair.word2;
            let cls = "bg-white border-gray-200";
            if (showResult) {
              if (n === targetWord) cls = "bg-emerald-50 border-emerald-300";
              else if (n === selected && n !== targetWord) cls = "bg-red-50 border-red-300";
            } else if (n === selected) {
              cls = "bg-rose-50 border-rose-300";
            }
            return (
              <button
                key={n}
                onClick={() => !showResult && checkAnswer(n as 1 | 2)}
                disabled={showResult}
                className={`p-4 rounded-xl border-2 text-center transition-all active:scale-95 ${cls}`}
              >
                <PersianText size="xl" className="text-gray-900 block mb-1">
                  {word.persian}
                </PersianText>
                <p className="text-xs text-gray-500">{word.romanization}</p>
                <p className="text-xs text-gray-400">{word.japanese}</p>
              </button>
            );
          })}
        </div>

        {/* Result */}
        {showResult && (
          <div className="animate-slide-in">
            <div
              className={`rounded-xl p-4 mb-4 ${
                selected === targetWord
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p className={`font-semibold mb-2 ${selected === targetWord ? "text-emerald-700" : "text-red-700"}`}>
                {selected === targetWord ? "正解!" : "不正解"}
              </p>
              <p className="text-sm text-gray-700 mb-3">{currentPair.contrastDescription}</p>

              {/* Play both words */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => playWord(1)}
                  disabled={isPlaying}
                  className="py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {currentPair.word1.persian} を聞く
                </button>
                <button
                  onClick={() => playWord(2)}
                  disabled={isPlaying}
                  className="py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {currentPair.word2.persian} を聞く
                </button>
              </div>
            </div>

            <button
              onClick={nextQuestion}
              className="w-full py-3 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors"
            >
              {questionCount >= 10 ? "結果を見る" : "次の問題"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Result Phase ──
  if (phase === "result") {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="px-4 pt-6 pb-8">
        <div className="text-center py-8">
          <p className="text-6xl mb-4">{pct >= 80 ? "👂" : pct >= 60 ? "🎧" : "💪"}</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">聞き分け結果</h2>
          <p className="text-lg text-gray-600 mb-1">{level} レベル</p>
          <div className="text-4xl font-bold text-rose-600 mb-2">{pct}%</div>
          <p className="text-gray-500">
            {score.correct}/{score.total} 正解
          </p>

          {pct >= 80 && (
            <p className="text-sm text-emerald-600 mt-2">素晴らしい聞き分け能力です!</p>
          )}
          {pct >= 50 && pct < 80 && (
            <p className="text-sm text-yellow-600 mt-2">もう少し練習しましょう。音の違いに注目!</p>
          )}
          {pct < 50 && (
            <p className="text-sm text-gray-600 mt-2">各ペアの音声を個別に聞いて違いを確認してみましょう</p>
          )}

          <div className="mt-8 space-y-3">
            <button
              onClick={() => startQuiz()}
              className="w-full py-3 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors"
            >
              もう一度挑戦
            </button>
            <button
              onClick={() => {
                setPhase("select");
              }}
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-colors"
            >
              一覧に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
