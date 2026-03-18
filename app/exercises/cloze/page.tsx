"use client";

import { useState, useEffect, useCallback } from "react";
import { useMergedVocabulary } from "@/lib/use-merged-data";
import { getCEFRProgress } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import { getAllCards, saveAllCards, calculateSRS, createNewCard } from "@/lib/srs";
import type { SRSCard } from "@/lib/srs";
import PersianText from "@/components/PersianText";
import AudioPlayer from "@/components/AudioPlayer";
import { extractRoman } from "@/lib/parse-cell";
import { apiUrl } from "@/lib/api-config";

interface ClozeData {
  sentence: string;
  answer: string;
  hint: string;
  translation: string;
}

export default function ClozePage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const { items } = useMergedVocabulary(level);
  const [cloze, setCloze] = useState<ClozeData | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [srsCards, setSrsCards] = useState<Record<string, SRSCard>>({});

  useEffect(() => {
    setLevel(getCEFRProgress().currentLevel);
    setSrsCards(getAllCards());
  }, []);

  const generateQuestion = useCallback(async () => {
    if (!items.length) return;
    setLoading(true);
    setCloze(null);
    setAnswer("");
    setResult(null);
    setShowHint(false);

    const word = items[Math.floor(Math.random() * items.length)];
    try {
      const res = await fetch(apiUrl("/api/exercise"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "cloze", word: word.ペルシア語, level }),
      });
      const data = await res.json();
      if (data.sentence) {
        setCloze({ ...data, answer: word.ペルシア語 });
      }
    } catch {
      // fallback: simple cloze
      setCloze({
        sentence: `___ (${word.ローマ字})`,
        answer: word.ペルシア語,
        hint: word.日本語,
        translation: word.日本語,
      });
    } finally {
      setLoading(false);
    }
  }, [items, level]);

  useEffect(() => {
    if (items.length > 0 && !cloze && !loading) generateQuestion();
  }, [items, cloze, loading, generateQuestion]);

  const checkAnswer = () => {
    if (!cloze) return;
    const normalized = answer.trim().replace(/\u200c/g, "");
    const target = cloze.answer.replace(/\u200c/g, "");
    const isCorrect = normalized === target;
    setResult(isCorrect ? "correct" : "wrong");
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));

    const key = cloze.answer;
    const existing = srsCards[key] || createNewCard(key);
    const updated = calculateSRS(existing, isCorrect ? 4 : 0);
    const next = { ...srsCards, [key]: updated };
    setSrsCards(next);
    saveAllCards(next);
  };

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">穴埋め問題</h1>
      <div className="text-sm text-gray-500 mb-4 text-right">
        正解率: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}% ({score.correct}/{score.total})
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="text-gray-500 animate-pulse">問題を生成中...</div>
        </div>
      )}

      {cloze && !loading && (
        <div className="animate-slide-in">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-4">
            <p className="text-xs text-gray-400 mb-3">空欄に入るペルシア語を入力してください</p>
            <PersianText size="xl" className="text-gray-900 block text-center mb-3">
              {cloze.sentence}
            </PersianText>
            <p className="text-sm text-gray-500 text-center">{cloze.translation}</p>
          </div>

          <div className="mb-4">
            <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !result && checkAnswer()}
              placeholder="ペルシア語で入力..." className="w-full p-3 rounded-lg border border-gray-200 bg-white text-lg persian-text"
              dir="rtl" disabled={!!result} />
          </div>

          <div className="flex gap-2 mb-4">
            {!result && (
              <>
                <button onClick={checkAnswer} className="flex-1 py-3 rounded-xl bg-violet-500 text-white font-semibold hover:bg-violet-600 transition-colors">回答</button>
                <button onClick={() => setShowHint(!showHint)} className="py-3 px-4 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors">ヒント</button>
              </>
            )}
          </div>

          {showHint && !result && (
            <div className="bg-yellow-50 rounded-lg p-3 mb-4 text-sm text-yellow-800">{cloze.hint}</div>
          )}

          {result && (
            <div className={`rounded-xl p-4 mb-4 animate-slide-in ${result === "correct" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <p className={`font-semibold mb-2 ${result === "correct" ? "text-emerald-700" : "text-red-700"}`}>
                {result === "correct" ? "正解!" : "不正解"}
              </p>
              <div className="flex items-center gap-3">
                <PersianText size="lg" className="text-gray-900">{cloze.answer}</PersianText>
                <AudioPlayer text={cloze.answer} />
              </div>
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
