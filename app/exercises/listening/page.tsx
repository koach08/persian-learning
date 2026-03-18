"use client";

import { useState, useEffect, useRef } from "react";
import { getCEFRProgress } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import AudioPlayer from "@/components/AudioPlayer";
import { apiUrl } from "@/lib/api-config";

// ── Types ──────────────────────────────────────────────────────

interface VocabItem {
  persian: string;
  romanized: string;
  japanese: string;
  example?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ListeningMaterial {
  id: string;
  title: string;
  titleJa: string;
  script: string;
  scriptRomanized: string;
  translation: string;
  level: string;
  vocabulary: VocabItem[];
  quiz: QuizQuestion[];
}

interface DictationResult {
  accuracy: number;
  corrections: { original: string; userInput: string; isCorrect: boolean }[];
  feedback: string;
  tips: string[];
  vocabularyNotes?: VocabItem[];
}

// ── Tab definitions ────────────────────────────────────────────

const TABS = [
  { id: "practice", label: "リスニング練習" },
  { id: "ai-generate", label: "AI素材生成" },
  { id: "dictation", label: "ディクテーション" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── History helpers (localStorage) ─────────────────────────────

const HISTORY_KEY = "listening-history";

interface HistoryEntry {
  date: string;
  type: string;
  title: string;
  score?: number;
}

function saveHistory(entry: Omit<HistoryEntry, "date">) {
  const history: HistoryEntry[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  history.unshift({ ...entry, date: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

// ── Main Component ─────────────────────────────────────────────

export default function ListeningPage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [activeTab, setActiveTab] = useState<TabId>("practice");

  useEffect(() => {
    setLevel(getCEFRProgress().currentLevel);
  }, []);

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-900 mb-2">リスニング</h1>

      {/* Level selector */}
      <div className="flex gap-2 mb-4">
        {(["A1", "A2", "B1", "B2"] as CEFRLevel[]).map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              level === l
                ? "bg-teal-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto mb-6 -mx-4 px-4 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-teal-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "practice" && <PracticeTab level={level} />}
      {activeTab === "ai-generate" && <AIGenerateTab level={level} />}
      {activeTab === "dictation" && <DictationTab level={level} />}
    </div>
  );
}

// ── Practice Tab ───────────────────────────────────────────────

function PracticeTab({ level }: { level: CEFRLevel }) {
  const [materials, setMaterials] = useState<ListeningMaterial[]>([]);
  const [selected, setSelected] = useState<ListeningMaterial | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDemos = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/listening/generate-practice"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setMaterials(data.materials || []);
      setSelected(null);
    } catch {
      setError("素材の読み込みに失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={loadDemos}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 disabled:opacity-50 transition-colors mb-4"
      >
        {loading ? "生成中..." : "素材を読み込む"}
      </button>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Material list */}
      {materials.length > 0 && !selected && (
        <div className="space-y-3">
          {materials.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="w-full text-left bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:border-teal-300 transition-colors"
            >
              <p className="font-medium text-gray-900 persian-text" dir="rtl">{m.title}</p>
              <p className="text-sm text-gray-500">{m.titleJa}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full">
                {m.level}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Selected material detail */}
      {selected && (
        <MaterialDetail
          material={selected}
          onBack={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Material Detail (shared by Practice & AI Generate) ─────────

function MaterialDetail({
  material,
  onBack,
}: {
  material: ListeningMaterial;
  onBack: () => void;
}) {
  const [showScript, setShowScript] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [dictationMode, setDictationMode] = useState(false);
  const [dictationInput, setDictationInput] = useState("");
  const [dictationResult, setDictationResult] = useState<DictationResult | null>(null);
  const [checkingDictation, setCheckingDictation] = useState(false);

  const checkDictation = async () => {
    setCheckingDictation(true);
    try {
      const res = await fetch(apiUrl("/api/listening/check-dictation"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original: material.script, userInput: dictationInput }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setDictationResult(data);
      saveHistory({ type: "dictation", title: material.titleJa, score: data.accuracy });
    } catch {
      // ignore
    } finally {
      setCheckingDictation(false);
    }
  };

  const quizScore =
    material.quiz.length > 0
      ? material.quiz.filter((q, i) => quizAnswers[i] === q.correctIndex).length
      : 0;
  const quizDone = Object.keys(quizAnswers).length === material.quiz.length && material.quiz.length > 0;
  const quizSavedRef = useRef(false);

  useEffect(() => {
    if (quizDone && !quizSavedRef.current) {
      quizSavedRef.current = true;
      saveHistory({ type: "quiz", title: material.titleJa, score: Math.round((quizScore / material.quiz.length) * 100) });
    }
  }, [quizDone, quizScore, material.titleJa, material.quiz.length]);

  return (
    <div className="animate-slide-in">
      <button onClick={onBack} className="text-teal-600 text-sm mb-4 hover:underline">
        ← 一覧に戻る
      </button>

      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-4">
        <h2 className="font-bold text-gray-900 persian-text text-lg mb-1" dir="rtl">
          {material.title}
        </h2>
        <p className="text-sm text-gray-500 mb-4">{material.titleJa}</p>

        {/* Audio playback */}
        <div className="flex items-center gap-3 mb-4">
          <AudioPlayer text={material.script} className="!w-12 !h-12" />
          <span className="text-sm text-gray-500">音声を再生</span>
        </div>

        {/* Script toggle */}
        <button
          onClick={() => setShowScript(!showScript)}
          className="text-sm text-teal-600 hover:underline mb-2"
        >
          {showScript ? "スクリプトを隠す" : "スクリプトを表示"}
        </button>
        {showScript && (
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <p className="persian-text text-gray-900 leading-relaxed" dir="rtl">
              {material.script}
            </p>
            <p className="text-sm text-gray-500 mt-2">{material.scriptRomanized}</p>
          </div>
        )}

        {/* Translation toggle */}
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className="block text-sm text-teal-600 hover:underline mb-2"
        >
          {showTranslation ? "日本語訳を隠す" : "日本語訳を表示"}
        </button>
        {showTranslation && (
          <div className="bg-blue-50 rounded-lg p-4 mb-3">
            <p className="text-gray-700 text-sm">{material.translation}</p>
          </div>
        )}
      </div>

      {/* Vocabulary */}
      {material.vocabulary.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">語彙</h3>
          <div className="space-y-2">
            {material.vocabulary.map((v, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <div>
                  <span className="persian-text text-gray-900" dir="rtl">{v.persian}</span>
                  <span className="text-gray-400 text-xs ml-2">({v.romanized})</span>
                </div>
                <span className="text-sm text-gray-600">{v.japanese}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setQuizMode(!quizMode); setDictationMode(false); }}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            quizMode ? "bg-purple-500 text-white" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
          }`}
        >
          クイズ
        </button>
        <button
          onClick={() => { setDictationMode(!dictationMode); setQuizMode(false); }}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            dictationMode ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          }`}
        >
          ディクテーション
        </button>
      </div>

      {/* Quiz */}
      {quizMode && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">理解度クイズ</h3>
          {material.quiz.map((q, qi) => (
            <div key={qi} className="mb-6 last:mb-0">
              <p className="text-sm font-medium text-gray-800 mb-2">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const answered = quizAnswers[qi] !== undefined;
                  const isSelected = quizAnswers[qi] === oi;
                  const isCorrect = q.correctIndex === oi;
                  let cls = "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100";
                  if (answered) {
                    if (isCorrect) cls = "bg-emerald-50 border border-emerald-300 text-emerald-800";
                    else if (isSelected) cls = "bg-red-50 border border-red-300 text-red-800";
                    else cls = "bg-gray-50 border border-gray-100 text-gray-400";
                  }
                  return (
                    <button
                      key={oi}
                      onClick={() => {
                        if (!answered) setQuizAnswers((a) => ({ ...a, [qi]: oi }));
                      }}
                      className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {quizAnswers[qi] !== undefined && (
                <p className="text-xs text-gray-500 mt-2">{q.explanation}</p>
              )}
            </div>
          ))}
          {quizDone && (
            <div className="mt-4 p-3 bg-teal-50 rounded-lg text-center">
              <p className="font-semibold text-teal-800">
                スコア: {quizScore}/{material.quiz.length} ({Math.round((quizScore / material.quiz.length) * 100)}%)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Dictation */}
      {dictationMode && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">ディクテーション</h3>
          <p className="text-sm text-gray-500 mb-3">音声を聞いて、聞こえたペルシア語を書いてください。</p>
          <AudioPlayer text={material.script} className="mx-auto !w-14 !h-14 mb-4" />
          <textarea
            value={dictationInput}
            onChange={(e) => setDictationInput(e.target.value)}
            dir="rtl"
            className="w-full p-3 border border-gray-200 rounded-lg persian-text text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-teal-300"
            rows={4}
            placeholder="ここにペルシア語を入力..."
          />
          <button
            onClick={checkDictation}
            disabled={!dictationInput.trim() || checkingDictation}
            className="w-full mt-3 py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {checkingDictation ? "チェック中..." : "チェックする"}
          </button>

          {dictationResult && (
            <div className="mt-4 space-y-3">
              <div className={`p-3 rounded-lg text-center ${
                dictationResult.accuracy >= 80 ? "bg-emerald-50" : dictationResult.accuracy >= 50 ? "bg-amber-50" : "bg-red-50"
              }`}>
                <p className="text-2xl font-bold">
                  {dictationResult.accuracy}%
                </p>
                <p className="text-sm text-gray-600">正確さ</p>
              </div>
              <p className="text-sm text-gray-700">{dictationResult.feedback}</p>
              {dictationResult.corrections.filter((c) => !c.isCorrect).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">修正箇所:</p>
                  {dictationResult.corrections
                    .filter((c) => !c.isCorrect)
                    .map((c, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="text-red-500 line-through persian-text" dir="rtl">{c.userInput}</span>
                        <span className="text-emerald-600 persian-text" dir="rtl">→ {c.original}</span>
                      </div>
                    ))}
                </div>
              )}
              {dictationResult.tips.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">アドバイス:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {dictationResult.tips.map((t, i) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Generate Tab ────────────────────────────────────────────

function AIGenerateTab({ level }: { level: CEFRLevel }) {
  const [topic, setTopic] = useState("");
  const [material, setMaterial] = useState<ListeningMaterial | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/listening/generate-material"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setMaterial({ id: "custom", ...data, level });
      saveHistory({ type: "ai-generate", title: topic });
    } catch {
      setError("生成に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  if (material) {
    return <MaterialDetail material={material} onBack={() => setMaterial(null)} />;
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        トピックを入力すると、AIがリスニング素材を生成します。
      </p>
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="例: イランの正月（ノウルーズ）"
        className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 mb-3"
        onKeyDown={(e) => e.key === "Enter" && generate()}
      />
      <div className="flex gap-2 flex-wrap mb-3">
        {["自己紹介", "レストランで注文", "道を聞く", "家族の紹介", "買い物"].map((t) => (
          <button
            key={t}
            onClick={() => setTopic(t)}
            className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-gray-200"
          >
            {t}
          </button>
        ))}
      </div>
      <button
        onClick={generate}
        disabled={!topic.trim() || loading}
        className="w-full py-3 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "生成中..." : "素材を生成する"}
      </button>
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  );
}

// ── Dictation Tab (standalone) ─────────────────────────────────

function DictationTab({ level }: { level: CEFRLevel }) {
  const [material, setMaterial] = useState<ListeningMaterial | null>(null);
  const [loading, setLoading] = useState(false);
  const [dictationInput, setDictationInput] = useState("");
  const [result, setResult] = useState<DictationResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [playCount, setPlayCount] = useState(0);

  const loadNew = async () => {
    setLoading(true);
    setResult(null);
    setDictationInput("");
    setPlayCount(0);
    try {
      const res = await fetch(apiUrl("/api/listening/generate-practice"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.materials?.length > 0) {
        setMaterial(data.materials[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const check = async () => {
    if (!material || !dictationInput.trim()) return;
    setChecking(true);
    try {
      const res = await fetch(apiUrl("/api/listening/check-dictation"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original: material.script, userInput: dictationInput }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(data);
      saveHistory({ type: "dictation-standalone", title: material.titleJa, score: data.accuracy });
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        音声を聞いてペルシア語を書き取る練習です。
      </p>

      <button
        onClick={loadNew}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors mb-4"
      >
        {loading ? "読み込み中..." : material ? "新しい素材を読み込む" : "ディクテーション素材を読み込む"}
      </button>

      {material && (
        <div className="animate-slide-in">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-4 text-center">
            <p className="text-sm text-gray-500 mb-3">{material.titleJa}</p>
            <AudioPlayer
              text={material.script}
              className="mx-auto !w-16 !h-16"
            />
            <p className="text-xs text-gray-400 mt-2">再生回数: {playCount}</p>
            <button
              onClick={() => setPlayCount((c) => c + 1)}
              className="text-xs text-teal-600 hover:underline mt-1"
            >
              もう一度聞く
            </button>
          </div>

          <textarea
            value={dictationInput}
            onChange={(e) => setDictationInput(e.target.value)}
            dir="rtl"
            className="w-full p-3 border border-gray-200 rounded-xl persian-text text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 mb-3"
            rows={5}
            placeholder="聞こえたペルシア語をここに書いてください..."
          />

          <button
            onClick={check}
            disabled={!dictationInput.trim() || checking}
            className="w-full py-3 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 disabled:opacity-50 transition-colors"
          >
            {checking ? "チェック中..." : "回答をチェックする"}
          </button>

          {result && (
            <div className="mt-4 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className={`p-4 rounded-xl text-center mb-4 ${
                result.accuracy >= 80 ? "bg-emerald-50" : result.accuracy >= 50 ? "bg-amber-50" : "bg-red-50"
              }`}>
                <p className="text-3xl font-bold">{result.accuracy}%</p>
                <p className="text-sm text-gray-600">正確さ</p>
              </div>

              <p className="text-sm text-gray-700 mb-3">{result.feedback}</p>

              {/* Show corrections */}
              {result.corrections.filter((c) => !c.isCorrect).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">修正箇所</p>
                  <div className="space-y-2">
                    {result.corrections.filter((c) => !c.isCorrect).map((c, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-red-500 persian-text line-through" dir="rtl">{c.userInput}</p>
                        <p className="text-xs text-emerald-600 persian-text" dir="rtl">→ {c.original}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show original script */}
              <details className="mt-3">
                <summary className="text-sm text-teal-600 cursor-pointer hover:underline">
                  正解を見る
                </summary>
                <div className="mt-2 bg-gray-50 rounded-lg p-3">
                  <p className="persian-text text-gray-900" dir="rtl">{material.script}</p>
                  <p className="text-xs text-gray-500 mt-1">{material.scriptRomanized}</p>
                  <p className="text-xs text-gray-500 mt-1">{material.translation}</p>
                </div>
              </details>

              {result.tips.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">上達のヒント</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {result.tips.map((t, i) => <li key={i}>• {t}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

