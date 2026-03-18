"use client";

import { useState, useEffect } from "react";
import { getCEFRProgress } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import {
  getTopicsByLevel,
  getGrammarProgress,
  saveGrammarProgress,
  type GrammarTopic,
  type GrammarQuestion,
  type GrammarProgress,
} from "@/lib/grammar-data";
import { addXP } from "@/lib/xp";
import { recordMistake } from "@/lib/mistake-tracker";
import PersianText from "@/components/PersianText";
import AudioPlayer from "@/components/AudioPlayer";
import { apiUrl } from "@/lib/api-config";

type Phase = "topics" | "study" | "quiz" | "result";

export default function GrammarPage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [phase, setPhase] = useState<Phase>("topics");
  const [topics, setTopics] = useState<GrammarTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<GrammarTopic | null>(null);
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | string | null>(null);
  const [fillAnswer, setFillAnswer] = useState("");
  const [correctionAnswer, setCorrectionAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [progress, setProgress] = useState<GrammarProgress>({ topicScores: {}, lastStudied: "" });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const l = getCEFRProgress().currentLevel;
    setLevel(l);
    setTopics(getTopicsByLevel(l));
    setProgress(getGrammarProgress());
  }, []);

  const handleLevelChange = (l: CEFRLevel) => {
    setLevel(l);
    setTopics(getTopicsByLevel(l));
    setPhase("topics");
    setSelectedTopic(null);
  };

  const selectTopic = (topic: GrammarTopic) => {
    setSelectedTopic(topic);
    setPhase("study");
  };

  const startQuiz = () => {
    if (!selectedTopic) return;
    setQuestions([...selectedTopic.questions]);
    setCurrentQ(0);
    setScore({ correct: 0, total: 0 });
    setSelected(null);
    setFillAnswer("");
    setCorrectionAnswer("");
    setShowResult(false);
    setPhase("quiz");
  };

  const generateMoreQuestions = async () => {
    if (!selectedTopic) return;
    setLoadingMore(true);
    try {
      const res = await fetch(apiUrl("/api/grammar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: selectedTopic.id,
          topicTitle: selectedTopic.title,
          level,
          existingQuestions: selectedTopic.questions.map((q) => q.question).join(", "),
        }),
      });
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
        setCurrentQ(0);
        setScore({ correct: 0, total: 0 });
        setSelected(null);
        setFillAnswer("");
        setCorrectionAnswer("");
        setShowResult(false);
        setPhase("quiz");
      }
    } catch {
      // fallback to built-in questions
      startQuiz();
    } finally {
      setLoadingMore(false);
    }
  };

  const q = questions[currentQ];

  const checkAnswer = () => {
    if (!q) return;
    let isCorrect = false;

    if (q.type === "multiple-choice") {
      isCorrect = selected === q.correctIndex;
    } else if (q.type === "fill-in") {
      const normalized = fillAnswer.trim().replace(/\u200c/g, "");
      const target = (q.answer || "").replace(/\u200c/g, "");
      isCorrect = normalized === target;
    } else if (q.type === "error-correction") {
      const normalized = correctionAnswer.trim().replace(/\u200c/g, "");
      const target = (q.corrected || "").replace(/\u200c/g, "");
      isCorrect = normalized === target;
    }

    setShowResult(true);
    setScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));

    if (isCorrect) {
      addXP("exerciseCorrect");
    } else if (q.type === "fill-in" && q.answer) {
      recordMistake(q.answer, "", q.question, "grammar", 0);
    }
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setFillAnswer("");
      setCorrectionAnswer("");
      setShowResult(false);
    } else {
      // Save progress
      if (selectedTopic) {
        const newProgress = { ...progress };
        const existing = newProgress.topicScores[selectedTopic.id] || { correct: 0, total: 0 };
        newProgress.topicScores[selectedTopic.id] = {
          correct: existing.correct + score.correct,
          total: existing.total + score.total,
        };
        newProgress.lastStudied = new Date().toISOString();
        setProgress(newProgress);
        saveGrammarProgress(newProgress);
      }
      setPhase("result");
    }
  };

  const isCorrectResult = () => {
    if (!q) return false;
    if (q.type === "multiple-choice") return selected === q.correctIndex;
    if (q.type === "fill-in") {
      return fillAnswer.trim().replace(/\u200c/g, "") === (q.answer || "").replace(/\u200c/g, "");
    }
    if (q.type === "error-correction") {
      return correctionAnswer.trim().replace(/\u200c/g, "") === (q.corrected || "").replace(/\u200c/g, "");
    }
    return false;
  };

  // ── Topic List ──
  if (phase === "topics") {
    return (
      <div className="px-4 pt-6 pb-8">
        <h1 className="text-xl font-bold text-gray-900 mb-2">文法クイズ</h1>
        <p className="text-sm text-gray-500 mb-4">レベル別の文法トピックを学習・テスト</p>

        {/* Level tabs */}
        <div className="flex gap-2 mb-6">
          {(["A1", "A2", "B1", "B2"] as CEFRLevel[]).map((l) => (
            <button
              key={l}
              onClick={() => handleLevelChange(l)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                level === l ? "bg-indigo-500 text-white shadow-md" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Topics */}
        <div className="space-y-3">
          {topics.map((topic) => {
            const topicScore = progress.topicScores[topic.id];
            const pct = topicScore ? Math.round((topicScore.correct / topicScore.total) * 100) : null;
            return (
              <button
                key={topic.id}
                onClick={() => selectTopic(topic)}
                className="w-full p-4 bg-white rounded-xl border border-gray-100 text-left hover:border-indigo-200 hover:bg-indigo-50/30 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{topic.title}</p>
                    <PersianText size="sm" className="text-gray-500 mt-0.5">
                      {topic.titlePersian}
                    </PersianText>
                  </div>
                  <div className="flex items-center gap-2">
                    {pct !== null && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          pct >= 80
                            ? "bg-emerald-100 text-emerald-700"
                            : pct >= 50
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {pct}%
                      </span>
                    )}
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{topic.questions.length}問 + AI追加問題</p>
              </button>
            );
          })}
        </div>

        {topics.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📝</p>
            <p>このレベルのトピックは準備中です</p>
          </div>
        )}
      </div>
    );
  }

  // ── Study Phase ──
  if (phase === "study" && selectedTopic) {
    return (
      <div className="px-4 pt-6 pb-8">
        <button onClick={() => setPhase("topics")} className="text-sm text-indigo-500 mb-4 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          トピック一覧
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-1">{selectedTopic.title}</h1>
        <PersianText size="lg" className="text-indigo-600 mb-4 block">
          {selectedTopic.titlePersian}
        </PersianText>

        {/* Explanation */}
        <div className="bg-indigo-50 rounded-xl p-4 mb-6 border border-indigo-100">
          <p className="text-sm text-gray-700 leading-relaxed">{selectedTopic.explanation}</p>
        </div>

        {/* Examples */}
        <p className="text-xs text-gray-400 font-medium mb-2">── 例文 ──</p>
        <div className="space-y-3 mb-6">
          {selectedTopic.examples.map((ex, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <PersianText size="lg" className="text-gray-900 flex-1">
                  {ex.persian}
                </PersianText>
                <AudioPlayer text={ex.persian} />
              </div>
              <p className="text-sm text-gray-500">{ex.romanization}</p>
              <p className="text-sm text-gray-700 mt-1">{ex.japanese}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <button
            onClick={startQuiz}
            className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors"
          >
            内蔵問題でテスト ({selectedTopic.questions.length}問)
          </button>
          <button
            onClick={generateMoreQuestions}
            disabled={loadingMore}
            className="w-full py-3 rounded-xl bg-white text-indigo-600 border border-indigo-200 font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            {loadingMore ? "AI問題を生成中..." : "AIで新しい問題を生成"}
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz Phase ──
  if (phase === "quiz" && q) {
    return (
      <div className="px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setPhase("study")} className="text-sm text-indigo-500">
            ← 戻る
          </button>
          <span className="text-sm text-gray-500">
            {currentQ + 1}/{questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question type badge */}
        <span className="inline-block text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 mb-3">
          {q.type === "multiple-choice" ? "選択問題" : q.type === "fill-in" ? "穴埋め" : "誤り訂正"}
        </span>

        <p className="text-base font-semibold text-gray-900 mb-4">{q.question}</p>

        {/* Multiple Choice */}
        {q.type === "multiple-choice" && q.options && (
          <div className="space-y-2 mb-4">
            {q.options.map((opt, i) => {
              let cls = "bg-white border-gray-200 text-gray-700";
              if (showResult) {
                if (i === q.correctIndex) cls = "bg-emerald-50 border-emerald-300 text-emerald-800";
                else if (i === selected && i !== q.correctIndex) cls = "bg-red-50 border-red-300 text-red-800";
              } else if (i === selected) {
                cls = "bg-indigo-50 border-indigo-300 text-indigo-700";
              }
              return (
                <button
                  key={i}
                  onClick={() => !showResult && setSelected(i)}
                  disabled={showResult}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${cls}`}
                >
                  <PersianText size="md">{opt}</PersianText>
                </button>
              );
            })}
          </div>
        )}

        {/* Fill-in */}
        {q.type === "fill-in" && q.sentence && (
          <div className="mb-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100 mb-3">
              <PersianText size="lg" className="text-gray-900 block text-center">
                {q.sentence}
              </PersianText>
            </div>
            {q.hint && <p className="text-xs text-gray-400 mb-2">ヒント: {q.hint}</p>}
            <input
              type="text"
              value={fillAnswer}
              onChange={(e) => setFillAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !showResult && checkAnswer()}
              placeholder="ペルシア語で入力..."
              className="w-full p-3 rounded-lg border border-gray-200 bg-white text-lg persian-text"
              dir="rtl"
              disabled={showResult}
            />
            {showResult && (
              <p className="text-sm mt-2">
                正解:{" "}
                <PersianText size="md" className="text-emerald-700 font-semibold">
                  {q.answer}
                </PersianText>
              </p>
            )}
          </div>
        )}

        {/* Error Correction */}
        {q.type === "error-correction" && q.sentence && (
          <div className="mb-4">
            <div className="bg-red-50 rounded-xl p-4 border border-red-100 mb-3">
              <p className="text-xs text-red-500 mb-1">間違いのある文:</p>
              <PersianText size="lg" className="text-red-800 block text-center">
                {q.sentence}
              </PersianText>
            </div>
            <input
              type="text"
              value={correctionAnswer}
              onChange={(e) => setCorrectionAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !showResult && checkAnswer()}
              placeholder="正しい文をペルシア語で入力..."
              className="w-full p-3 rounded-lg border border-gray-200 bg-white text-lg persian-text"
              dir="rtl"
              disabled={showResult}
            />
            {showResult && (
              <p className="text-sm mt-2">
                正解:{" "}
                <PersianText size="md" className="text-emerald-700 font-semibold">
                  {q.corrected}
                </PersianText>
              </p>
            )}
          </div>
        )}

        {/* Answer / Next buttons */}
        {!showResult ? (
          <button
            onClick={checkAnswer}
            disabled={q.type === "multiple-choice" ? selected === null : q.type === "fill-in" ? !fillAnswer.trim() : !correctionAnswer.trim()}
            className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            回答する
          </button>
        ) : (
          <div className="space-y-3">
            <div
              className={`rounded-xl p-4 ${
                isCorrectResult() ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
              }`}
            >
              <p className={`font-semibold mb-1 ${isCorrectResult() ? "text-emerald-700" : "text-red-700"}`}>
                {isCorrectResult() ? "正解!" : "不正解"}
              </p>
              <p className="text-sm text-gray-700">{q.explanation}</p>
            </div>
            <button
              onClick={nextQuestion}
              className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors"
            >
              {currentQ < questions.length - 1 ? "次の問題" : "結果を見る"}
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
          <p className="text-6xl mb-4">{pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪"}</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">結果</h2>
          <p className="text-lg text-gray-600 mb-1">
            {selectedTopic?.title}
          </p>
          <div className="text-4xl font-bold text-indigo-600 mb-2">{pct}%</div>
          <p className="text-gray-500">
            {score.correct}/{score.total} 正解
          </p>

          <div className="mt-8 space-y-3">
            <button
              onClick={startQuiz}
              className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors"
            >
              もう一度挑戦
            </button>
            <button
              onClick={generateMoreQuestions}
              disabled={loadingMore}
              className="w-full py-3 rounded-xl bg-white text-indigo-600 border border-indigo-200 font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              {loadingMore ? "生成中..." : "AIで新しい問題に挑戦"}
            </button>
            <button
              onClick={() => {
                setPhase("topics");
                setSelectedTopic(null);
              }}
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-colors"
            >
              トピック一覧に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
