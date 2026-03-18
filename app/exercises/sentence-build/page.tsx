"use client";

import { useState, useEffect, useCallback } from "react";
import { getCEFRProgress } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import { addXP } from "@/lib/xp";
import { recordMistake } from "@/lib/mistake-tracker";
import PersianText from "@/components/PersianText";
import AudioPlayer from "@/components/AudioPlayer";
import { apiUrl } from "@/lib/api-config";

interface SentenceData {
  sentence: string;
  words: string[];
  romanization: string;
  translation: string;
}

export default function SentenceBuildPage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [data, setData] = useState<SentenceData | null>(null);
  const [available, setAvailable] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    setLevel(getCEFRProgress().currentLevel);
  }, []);

  const generateQuestion = useCallback(async () => {
    setLoading(true);
    setData(null);
    setBuilt([]);
    setResult(null);

    try {
      const res = await fetch(apiUrl("/api/exercise"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sentence-build", level }),
      });
      const json = await res.json();
      if (json.words && json.sentence) {
        setData(json);
        setAvailable([...json.words]);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => {
    if (!data && !loading) generateQuestion();
  }, [data, loading, generateQuestion]);

  const addWord = (word: string, index: number) => {
    setBuilt([...built, word]);
    const next = [...available];
    next.splice(index, 1);
    setAvailable(next);
  };

  const removeWord = (index: number) => {
    const word = built[index];
    const next = [...built];
    next.splice(index, 1);
    setBuilt(next);
    setAvailable([...available, word]);
  };

  const checkAnswer = () => {
    if (!data) return;
    const builtSentence = built.join(" ");
    const isCorrect = builtSentence === data.sentence;
    setResult(isCorrect ? "correct" : "wrong");
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));

    if (isCorrect) {
      addXP("exerciseCorrect");
    } else {
      recordMistake(data.sentence, data.romanization, data.translation, "sentence-build", 0);
    }
  };

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">語順並べ替え</h1>
      <div className="text-sm text-gray-500 mb-4 text-right">
        正解率: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}% ({score.correct}/{score.total})
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="text-gray-500 animate-pulse">問題を生成中...</div>
        </div>
      )}

      {data && !loading && (
        <div className="animate-slide-in">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-4">
            <p className="text-xs text-gray-400 mb-2">正しい語順に並べてください</p>
            <p className="text-sm text-gray-600">{data.translation}</p>
          </div>

          {/* Built sentence area */}
          <div className="min-h-[60px] p-4 bg-amber-50 rounded-xl border-2 border-dashed border-amber-200 mb-4 flex flex-wrap gap-2" dir="rtl">
            {built.length === 0 && <span className="text-amber-300 text-sm">ここに単語が並びます</span>}
            {built.map((word, i) => (
              <button key={`${word}-${i}`} onClick={() => removeWord(i)}
                className="px-3 py-1.5 bg-amber-200 text-amber-900 rounded-lg persian-text text-lg hover:bg-amber-300 transition-colors">
                {word}
              </button>
            ))}
          </div>

          {/* Available words */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center" dir="rtl">
            {available.map((word, i) => (
              <button key={`${word}-${i}`} onClick={() => addWord(word, i)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg persian-text text-lg hover:bg-gray-50 transition-colors shadow-sm">
                {word}
              </button>
            ))}
          </div>

          {!result && available.length === 0 && (
            <button onClick={checkAnswer}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors">
              回答を確認
            </button>
          )}

          {result && (
            <div className={`rounded-xl p-4 mb-4 animate-slide-in ${result === "correct" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <p className={`font-semibold mb-2 ${result === "correct" ? "text-emerald-700" : "text-red-700"}`}>
                {result === "correct" ? "正解!" : "不正解"}
              </p>
              <div className="flex items-center gap-3 mb-2">
                <PersianText size="lg" className="text-gray-900">{data.sentence}</PersianText>
                <AudioPlayer text={data.sentence} />
              </div>
              <p className="text-sm text-gray-500">{data.romanization}</p>
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
