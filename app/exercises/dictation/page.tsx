"use client";

import { useState, useEffect, useCallback } from "react";
import { useMergedVocabulary } from "@/lib/use-merged-data";
import { getCEFRProgress } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import type { VocabularyItem } from "@/lib/data-loader";
import { getAllCards, saveAllCards, calculateSRS, createNewCard } from "@/lib/srs";
import type { SRSCard } from "@/lib/srs";
import { addXP } from "@/lib/xp";
import { recordMistake } from "@/lib/mistake-tracker";
import AudioPlayer from "@/components/AudioPlayer";
import PersianText from "@/components/PersianText";

function normalize(text: string): string {
  return text.trim()
    .replace(/\u200c/g, "")  // remove ZWNJ
    .replace(/ی/g, "ی")      // normalize ya
    .replace(/ک/g, "ک");     // normalize kaf
}

export default function DictationPage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const { items } = useMergedVocabulary(level);
  const [current, setCurrent] = useState<VocabularyItem | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [srsCards, setSrsCards] = useState<Record<string, SRSCard>>({});

  useEffect(() => {
    setLevel(getCEFRProgress().currentLevel);
    setSrsCards(getAllCards());
  }, []);

  const generateQuestion = useCallback(() => {
    if (!items.length) return;
    const word = items[Math.floor(Math.random() * items.length)];
    setCurrent(word);
    setAnswer("");
    setResult(null);
  }, [items]);

  useEffect(() => {
    if (items.length > 0 && !current) generateQuestion();
  }, [items, current, generateQuestion]);

  const checkAnswer = () => {
    if (!current) return;
    const isCorrect = normalize(answer) === normalize(current.ペルシア語);
    setResult(isCorrect ? "correct" : "wrong");
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));

    if (isCorrect) {
      addXP("exerciseCorrect");
    } else {
      recordMistake(current.ペルシア語, current.ローマ字, current.日本語, "dictation", 0);
    }

    const key = current.ペルシア語;
    const existing = srsCards[key] || createNewCard(key);
    const updated = calculateSRS(existing, isCorrect ? 4 : 0);
    const next = { ...srsCards, [key]: updated };
    setSrsCards(next);
    saveAllCards(next);
  };

  if (!items.length) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">読み込み中...</p></div>;
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">ディクテーション</h1>
      <div className="text-sm text-gray-500 mb-4 text-right">
        正解率: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}% ({score.correct}/{score.total})
      </div>

      {current && (
        <div className="animate-slide-in">
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 mb-6 text-center">
            <p className="text-sm text-gray-500 mb-4">音声を聞いてペルシア語で書いてください</p>
            <AudioPlayer text={current.ペルシア語} className="mx-auto !w-16 !h-16" />
            <p className="text-xs text-gray-400 mt-3">ヒント: {current.日本語}</p>
          </div>

          <div className="mb-4">
            <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !result && checkAnswer()}
              placeholder="ペルシア語で入力..."
              className="w-full p-3 rounded-lg border border-gray-200 bg-white text-lg persian-text"
              dir="rtl" disabled={!!result} />
          </div>

          {!result && (
            <button onClick={checkAnswer}
              className="w-full py-3 rounded-xl bg-cyan-500 text-white font-semibold hover:bg-cyan-600 transition-colors">
              回答
            </button>
          )}

          {result && (
            <div className={`rounded-xl p-4 mb-4 animate-slide-in ${result === "correct" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <p className={`font-semibold mb-2 ${result === "correct" ? "text-emerald-700" : "text-red-700"}`}>
                {result === "correct" ? "正解!" : "不正解"}
              </p>
              <div className="flex items-center gap-3 mb-1">
                <PersianText size="lg" className="text-gray-900">{current.ペルシア語}</PersianText>
                <AudioPlayer text={current.ペルシア語} />
              </div>
              <p className="text-sm text-gray-500">{current.ローマ字} — {current.日本語}</p>
              <button onClick={generateQuestion}
                className="mt-3 w-full py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">
                次の問題
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
