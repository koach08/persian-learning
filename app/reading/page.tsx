"use client";

import { useState, useEffect } from "react";
import { getCEFRProgress } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import PersianText from "@/components/PersianText";
import AudioPlayer from "@/components/AudioPlayer";
import { apiUrl } from "@/lib/api-config";

interface VocabItem {
  persian: string;
  romanization: string;
  japanese: string;
}

interface ReadingQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ReadingData {
  title: string;
  titleJapanese: string;
  passage: string;
  romanization: string;
  translation: string;
  vocabulary: VocabItem[];
  questions: ReadingQuestion[];
}

type Phase = "select" | "reading" | "quiz" | "result";

const TOPICS: Record<CEFRLevel, string[]> = {
  A1: ["自己紹介", "家族", "食べ物", "色と数字", "学校"],
  A2: ["買い物", "レストラン", "天気と季節", "趣味", "旅行"],
  B1: ["イランの文化", "仕事と将来", "健康", "お祭り", "テクノロジー"],
  B2: ["社会問題", "文学", "歴史", "環境", "哲学"],
  C1: ["学術論文", "政治と外交", "経済分析", "科学技術", "文学批評"],
  C2: ["ペルシア古典詩", "社会風刺", "哲学的随筆", "修辞と弁論", "文化的アイデンティティ"],
};

export default function ReadingPage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [phase, setPhase] = useState<Phase>("select");
  const [reading, setReading] = useState<ReadingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRoman, setShowRoman] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [expandedVocab, setExpandedVocab] = useState<Set<number>>(new Set());
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [history, setHistory] = useState<{ topic: string; score: number; date: string }[]>([]);

  useEffect(() => {
    const l = getCEFRProgress().currentLevel;
    setLevel(l);
    setShowRoman(l === "A1" || l === "A2");

    const raw = localStorage.getItem("reading-history");
    if (raw) setHistory(JSON.parse(raw));
  }, []);

  const generatePassage = async (topic: string) => {
    setLoading(true);
    setPhase("reading");
    setReading(null);
    try {
      const res = await fetch(apiUrl("/api/reading"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, topic }),
      });
      const data = await res.json();
      if (data.passage) {
        setReading(data);
      }
    } catch {
      // Show error state
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    if (!reading) return;
    setCurrentQ(0);
    setSelected(null);
    setShowAnswer(false);
    setScore({ correct: 0, total: 0 });
    setPhase("quiz");
  };

  const checkAnswer = () => {
    if (!reading || selected === null) return;
    const isCorrect = selected === reading.questions[currentQ].correctIndex;
    setShowAnswer(true);
    setScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));
  };

  const nextQuestion = () => {
    if (!reading) return;
    if (currentQ < reading.questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setShowAnswer(false);
    } else {
      // Save history
      const entry = {
        topic: reading.titleJapanese,
        score: Math.round(((score.correct) / reading.questions.length) * 100),
        date: new Date().toISOString().split("T")[0],
      };
      const newHistory = [entry, ...history].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem("reading-history", JSON.stringify(newHistory));
      setPhase("result");
    }
  };

  const toggleVocab = (i: number) => {
    const next = new Set(expandedVocab);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setExpandedVocab(next);
  };

  // ── Topic Selection ──
  if (phase === "select") {
    return (
      <div className="px-4 pt-6 pb-8">
        <h1 className="text-xl font-bold text-gray-900 mb-2">読解練習</h1>
        <p className="text-sm text-gray-500 mb-4">レベルに合わせた文章を読んで理解力を鍛えよう</p>

        {/* Level tabs */}
        <div className="flex gap-2 mb-6">
          {(["A1", "A2", "B1", "B2"] as CEFRLevel[]).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLevel(l);
                setShowRoman(l === "A1" || l === "A2");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                level === l ? "bg-teal-500 text-white shadow-md" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Topic grid */}
        <p className="text-xs text-gray-400 font-medium mb-2">── トピックを選択 ──</p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {TOPICS[level].map((topic) => (
            <button
              key={topic}
              onClick={() => generatePassage(topic)}
              className="p-4 bg-white rounded-xl border border-gray-100 text-center hover:border-teal-200 hover:bg-teal-50/30 transition-all active:scale-95"
            >
              <span className="text-sm font-medium text-gray-700">{topic}</span>
            </button>
          ))}
        </div>

        {/* Random */}
        <button
          onClick={() => generatePassage("")}
          className="w-full py-3 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors mb-6"
        >
          ランダムなトピックで読む
        </button>

        {/* History */}
        {history.length > 0 && (
          <>
            <p className="text-xs text-gray-400 font-medium mb-2">── 学習履歴 ──</p>
            <div className="space-y-2">
              {history.slice(0, 5).map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                  <span className="text-sm text-gray-700">{h.topic}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${h.score >= 80 ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {h.score}%
                    </span>
                    <span className="text-xs text-gray-400">{h.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Reading Phase ──
  if (phase === "reading") {
    return (
      <div className="px-4 pt-6 pb-8">
        <button onClick={() => setPhase("select")} className="text-sm text-teal-500 mb-4 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          トピック選択
        </button>

        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="text-gray-500 animate-pulse">文章を生成中...</div>
          </div>
        )}

        {reading && !loading && (
          <div className="animate-slide-in">
            <h2 className="text-lg font-bold text-gray-900 mb-1">{reading.titleJapanese}</h2>
            <PersianText size="lg" className="text-teal-600 mb-4 block">
              {reading.title}
            </PersianText>

            {/* Passage */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
              <div className="flex items-start gap-2 mb-3">
                <PersianText size="lg" className="text-gray-900 leading-loose flex-1">
                  {reading.passage}
                </PersianText>
                <AudioPlayer text={reading.passage} />
              </div>

              {/* Toggle buttons */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setShowRoman(!showRoman)}
                  className={`text-xs px-3 py-1 rounded-full transition-all ${
                    showRoman ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  ローマ字
                </button>
                <button
                  onClick={() => setShowTranslation(!showTranslation)}
                  className={`text-xs px-3 py-1 rounded-full transition-all ${
                    showTranslation ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  日本語訳
                </button>
              </div>

              {showRoman && (
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">{reading.romanization}</p>
              )}
              {showTranslation && (
                <p className="text-sm text-gray-700 mt-3 leading-relaxed bg-yellow-50 p-3 rounded-lg">{reading.translation}</p>
              )}
            </div>

            {/* Key Vocabulary */}
            {reading.vocabulary && reading.vocabulary.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 font-medium mb-2">── キーワード ──</p>
                <div className="space-y-1">
                  {reading.vocabulary.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => toggleVocab(i)}
                      className="w-full p-3 bg-white rounded-lg border border-gray-100 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PersianText size="md" className="text-gray-900">
                            {v.persian}
                          </PersianText>
                          <AudioPlayer text={v.persian} />
                        </div>
                        {expandedVocab.has(i) ? (
                          <span className="text-sm text-gray-600">{v.japanese}</span>
                        ) : (
                          <span className="text-xs text-gray-400">タップで意味を見る</span>
                        )}
                      </div>
                      {expandedVocab.has(i) && (
                        <p className="text-xs text-gray-400 mt-1">{v.romanization}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start quiz */}
            <button
              onClick={startQuiz}
              className="w-full py-3 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors"
            >
              理解度チェック ({reading.questions?.length || 0}問)
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Quiz Phase ──
  if (phase === "quiz" && reading) {
    const q = reading.questions[currentQ];
    return (
      <div className="px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setPhase("reading")} className="text-sm text-teal-500">
            ← 文章に戻る
          </button>
          <span className="text-sm text-gray-500">
            {currentQ + 1}/{reading.questions.length}
          </span>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${((currentQ + 1) / reading.questions.length) * 100}%` }}
          />
        </div>

        <p className="text-base font-semibold text-gray-900 mb-4">{q.question}</p>

        <div className="space-y-2 mb-4">
          {q.options.map((opt, i) => {
            let cls = "bg-white border-gray-200 text-gray-700";
            if (showAnswer) {
              if (i === q.correctIndex) cls = "bg-emerald-50 border-emerald-300 text-emerald-800";
              else if (i === selected && i !== q.correctIndex) cls = "bg-red-50 border-red-300 text-red-800";
            } else if (i === selected) {
              cls = "bg-teal-50 border-teal-300 text-teal-700";
            }
            return (
              <button
                key={i}
                onClick={() => !showAnswer && setSelected(i)}
                disabled={showAnswer}
                className={`w-full p-3 rounded-xl border text-left transition-all ${cls}`}
              >
                <PersianText size="md">{opt}</PersianText>
              </button>
            );
          })}
        </div>

        {!showAnswer ? (
          <button
            onClick={checkAnswer}
            disabled={selected === null}
            className="w-full py-3 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50"
          >
            回答する
          </button>
        ) : (
          <div className="space-y-3">
            <div
              className={`rounded-xl p-4 ${
                selected === q.correctIndex ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
              }`}
            >
              <p className={`font-semibold mb-1 ${selected === q.correctIndex ? "text-emerald-700" : "text-red-700"}`}>
                {selected === q.correctIndex ? "正解!" : "不正解"}
              </p>
              <p className="text-sm text-gray-700">{q.explanation}</p>
            </div>
            <button
              onClick={nextQuestion}
              className="w-full py-3 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors"
            >
              {currentQ < reading.questions.length - 1 ? "次の問題" : "結果を見る"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Result Phase ──
  if (phase === "result" && reading) {
    const pct = reading.questions.length > 0 ? Math.round((score.correct / reading.questions.length) * 100) : 0;
    return (
      <div className="px-4 pt-6 pb-8">
        <div className="text-center py-8">
          <p className="text-6xl mb-4">{pct >= 80 ? "🎉" : pct >= 50 ? "📖" : "💪"}</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">読解結果</h2>
          <p className="text-lg text-gray-600 mb-1">{reading.titleJapanese}</p>
          <div className="text-4xl font-bold text-teal-600 mb-2">{pct}%</div>
          <p className="text-gray-500">
            {score.correct}/{reading.questions.length} 正解
          </p>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => setPhase("reading")}
              className="w-full py-3 rounded-xl bg-white text-teal-600 border border-teal-200 font-semibold hover:bg-teal-50 transition-colors"
            >
              文章を読み直す
            </button>
            <button
              onClick={() => {
                setPhase("select");
                setReading(null);
              }}
              className="w-full py-3 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors"
            >
              別のトピックを読む
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
