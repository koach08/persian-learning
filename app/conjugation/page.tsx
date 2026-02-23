"use client";

import { useState, useEffect } from "react";
import { loadConjugations, ConjugationItem } from "@/lib/data-loader";
import PersianText from "@/components/PersianText";
import AudioPlayer from "@/components/AudioPlayer";
import { parseCell, extractRoman } from "@/lib/parse-cell";

type PersonKey = "من (私)" | "تو (君)" | "او (彼/彼女)" | "ما (私達)" | "شما (あなた達)" | "آنها (彼ら)";

const PERSONS: { key: PersonKey; label: string }[] = [
  { key: "من (私)", label: "من (私)" },
  { key: "تو (君)", label: "تو (君)" },
  { key: "او (彼/彼女)", label: "او (彼女/彼)" },
  { key: "ما (私達)", label: "ما (私達)" },
  { key: "شما (あなた達)", label: "شما (あなた達)" },
  { key: "آنها (彼ら)", label: "آنها (彼ら)" },
];

export default function ConjugationPage() {
  const [data, setData] = useState<ConjugationItem[]>([]);
  const [mode, setMode] = useState<"drill" | "table">("drill");
  const [question, setQuestion] = useState<{
    item: ConjugationItem;
    person: PersonKey;
  } | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    loadConjugations().then(setData);
  }, []);

  const generateQuestion = () => {
    const validRows = data.filter((row) => {
      return PERSONS.some((p) => row[p.key] && row[p.key] !== "-");
    });
    if (!validRows.length) return;

    const row = validRows[Math.floor(Math.random() * validRows.length)];
    const validPersons = PERSONS.filter((p) => row[p.key] && row[p.key] !== "-");
    const person = validPersons[Math.floor(Math.random() * validPersons.length)];

    setQuestion({ item: row, person: person.key });
    setAnswer("");
    setResult(null);
    setShowHint(false);
  };

  useEffect(() => {
    if (data.length > 0 && !question) generateQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const checkAnswer = () => {
    if (!question) return;
    const cell = question.item[question.person];
    const { persian } = parseCell(cell);
    const roman = extractRoman(cell);

    const normalizedAnswer = answer.trim();
    const isCorrect =
      normalizedAnswer === persian ||
      normalizedAnswer.toLowerCase() === roman.toLowerCase();

    setResult(isCorrect ? "correct" : "wrong");
    setScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));
  };

  const getVerbGroups = () => {
    const groups: Record<string, ConjugationItem[]> = {};
    data.forEach((row) => {
      const verb = row["動詞（不定形）"];
      if (!groups[verb]) groups[verb] = [];
      groups[verb].push(row);
    });
    return groups;
  };

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">動詞活用ドリル</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("drill")}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            mode === "drill"
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          ドリル
        </button>
        <button
          onClick={() => setMode("table")}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            mode === "table"
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          活用表
        </button>
      </div>

      {mode === "drill" && question && (
        <div className="animate-slide-in">
          <div className="text-sm text-gray-500 mb-4 text-right">
            正解率: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
            ({score.correct}/{score.total})
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-4">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 mb-1">
                {question.item.日本語} ({question.item.ローマ字})
              </p>
              <PersianText size="xl" className="text-gray-900">
                {question.item["動詞（不定形）"]}
              </PersianText>
            </div>

            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {question.item.時制}
              </span>
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                {question.person}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
              placeholder="ペルシア語 or ローマ字で入力"
              className="w-full p-3 rounded-lg border border-gray-200 bg-white text-lg"
              dir="auto"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={checkAnswer}
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
            >
              回答
            </button>
            <button
              onClick={() => setShowHint(!showHint)}
              className="py-3 px-4 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
            >
              ヒント
            </button>
          </div>

          {showHint && (
            <div className="bg-yellow-50 rounded-lg p-3 mb-4 text-sm text-yellow-800">
              ローマ字: {extractRoman(question.item[question.person])}
            </div>
          )}

          {result && (
            <div
              className={`rounded-xl p-4 mb-4 animate-slide-in ${
                result === "correct"
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`font-semibold mb-2 ${
                  result === "correct" ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {result === "correct" ? "正解!" : "不正解"}
              </p>
              <div className="flex items-center gap-3">
                <PersianText size="lg" className="text-gray-900">
                  {parseCell(question.item[question.person]).persian}
                </PersianText>
                <AudioPlayer
                  text={parseCell(question.item[question.person]).persian}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {extractRoman(question.item[question.person])}
              </p>
              <button
                onClick={generateQuestion}
                className="mt-3 w-full py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
              >
                次の問題
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "table" && (
        <div className="space-y-6">
          {Object.entries(getVerbGroups()).map(([verb, rows]) => (
            <div
              key={verb}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="bg-blue-50 p-3 border-b border-blue-100">
                <div className="flex items-center gap-3">
                  <PersianText size="lg" className="text-blue-900">
                    {verb}
                  </PersianText>
                  <span className="text-sm text-blue-600">
                    {rows[0].日本語} ({rows[0].ローマ字})
                  </span>
                  <AudioPlayer text={verb} className="ml-auto" />
                </div>
              </div>

              {rows.map((row) => (
                <div key={row.時制} className="p-3 border-b border-gray-50 last:border-0">
                  <p className="text-xs font-semibold text-gray-500 mb-2 bg-gray-100 inline-block px-2 py-0.5 rounded">
                    {row.時制}
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {PERSONS.map((p) => {
                      const cell = row[p.key];
                      if (cell === "-") return null;
                      const { persian, roman } = parseCell(cell);
                      return (
                        <div
                          key={p.key}
                          className="flex items-center gap-1 p-1 rounded hover:bg-gray-50"
                        >
                          <span className="text-xs text-gray-400 w-16 flex-shrink-0">
                            {p.label.split(" ")[0]}
                          </span>
                          <PersianText size="sm" className="text-gray-800">
                            {persian}
                          </PersianText>
                          {roman && (
                            <span className="text-xs text-gray-400">({roman})</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
