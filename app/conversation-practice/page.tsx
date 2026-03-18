"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { getCEFRProgress, CEFR_LEVELS } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import {
  SCENARIO_LIST,
  getScenariosByLevel,
  getBestScore,
  saveResult,
  quickMatch,
  type Scenario,
  type ScenarioMeta,
  type ScenarioTurn,
  type TurnResult,
} from "@/lib/conversation-practice";
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import { useTTS } from "@/lib/use-tts";
import { addXP } from "@/lib/xp";
import { recordMistake } from "@/lib/mistake-tracker";
import type { TTSOptions } from "@/lib/use-tts";
import { PERSIAN_VOICES, JAPANESE_VOICES, detectGender } from "@/lib/voice-config";
import type { Gender } from "@/lib/voice-config";
import { apiUrl } from "@/lib/api-config";

type Phase = "select" | "intro" | "listen" | "practice" | "free-talk" | "summary";

/** Get TTS options for a dialogue turn based on speaker info */
function getTurnVoiceOptions(turn: ScenarioTurn): TTSOptions {
  const gender: Gender = turn.gender || (turn.speakerName ? detectGender(turn.speakerName) : "female");
  return {
    voice: gender === "male" ? PERSIAN_VOICES.male : PERSIAN_VOICES.female,
    lang: "fa",
    style: "natural",
  };
}

export default function ConversationPracticePage() {
  const [phase, setPhase] = useState<Phase>("select");
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioMeta | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);

  // Practice state
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [turnResults, setTurnResults] = useState<TurnResult[]>([]);
  const [userInput, setUserInput] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; feedback: string; correction?: string } | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Listen phase state
  const [listenIndex, setListenIndex] = useState(-1);

  // Free talk state
  const [freeTalkMessages, setFreeTalkMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [freeTalkInput, setFreeTalkInput] = useState("");
  const [freeTalkLoading, setFreeTalkLoading] = useState(false);
  const [freeTalkTurns, setFreeTalkTurns] = useState(0);

  // Scores cache for scenario list
  const [scores, setScores] = useState<Record<string, number | null>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Shared hooks
  const { isRecording, isTranscribing: transcribing, transcribedText, startRecording, stopRecording, clearText } = useAudioRecorder();
  const { isPlaying: ttsPlaying, play: playTTS, playJa: playJaTTS, stop: stopTTS } = useTTS();

  useEffect(() => {
    const progress = getCEFRProgress();
    setLevel(progress.currentLevel);
  }, []);

  useEffect(() => {
    // Load scores for all scenarios
    const s: Record<string, number | null> = {};
    SCENARIO_LIST.forEach((sc) => {
      s[sc.id] = getBestScore(sc.id);
    });
    setScores(s);
  }, [phase]);

  // Sync transcribed text to userInput
  useEffect(() => {
    if (transcribedText && !transcribing) {
      setUserInput(transcribedText);
      clearText();
    }
  }, [transcribedText, transcribing, clearText]);

  // --- Speaker info display ---
  const speakerLabel = (turn: ScenarioTurn): string => {
    if (turn.speakerName) return turn.speakerName;
    return turn.speaker === "ai" ? "AI" : "あなた";
  };

  const speakerColor = (turn: ScenarioTurn): { bg: string; text: string } => {
    if (turn.speaker === "user") return { bg: "bg-rose-100", text: "text-rose-600" };
    // Different color for different AI speakers
    const gender = turn.gender || (turn.speakerName ? detectGender(turn.speakerName) : "male");
    return gender === "female"
      ? { bg: "bg-purple-100", text: "text-purple-600" }
      : { bg: "bg-blue-100", text: "text-blue-600" };
  };

  // --- Play turn with appropriate voice ---
  const playTurn = (turn: ScenarioTurn) => {
    playTTS(turn.persian, getTurnVoiceOptions(turn));
  };

  // --- Scenario Generation ---
  const generateScenario = async (meta: ScenarioMeta) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/conversation-practice"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          scenarioId: meta.id,
          scenarioTitle: meta.title,
          level: meta.level,
        }),
      });
      const data = await res.json();
      setScenario(data);
      setPhase("intro");
    } catch {
      alert("シナリオの生成に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  // --- Evaluate User Answer ---
  const evaluateAnswer = async (userText: string) => {
    if (!scenario) return;
    const turn = scenario.dialogue[currentTurnIndex];
    if (turn.speaker !== "user") return;

    // Quick local match first
    const localScore = quickMatch(userText, turn.persian, turn.alternatives);

    if (localScore >= 90) {
      // Perfect local match, skip API call
      const result: TurnResult = {
        turnIndex: currentTurnIndex,
        userText,
        expectedText: turn.persian,
        score: localScore,
        feedback: "すばらしい！完璧です！",
      };
      setFeedback({ score: localScore, feedback: result.feedback });
      setTurnResults((prev) => [...prev, result]);
      addXP("conversationTurn");
      return;
    }

    // Use API for deeper evaluation
    setEvaluating(true);
    try {
      const res = await fetch(apiUrl("/api/conversation-practice"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          userText,
          expectedText: turn.persian,
          alternatives: turn.alternatives,
        }),
      });
      const data = await res.json();
      const result: TurnResult = {
        turnIndex: currentTurnIndex,
        userText,
        expectedText: turn.persian,
        score: data.score,
        feedback: data.feedback,
        correction: data.correction,
      };
      setFeedback(data);
      setTurnResults((prev) => [...prev, result]);
      addXP("conversationTurn");
      if (data.score < 50) {
        recordMistake(turn.persian, turn.romanization, turn.japanese, "conversation", data.score);
      }
    } catch {
      setFeedback({ score: localScore, feedback: "評価に失敗しましたが、続けましょう！" });
      setTurnResults((prev) => [...prev, {
        turnIndex: currentTurnIndex,
        userText,
        expectedText: turn.persian,
        score: localScore,
        feedback: "評価エラー",
      }]);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!userInput.trim()) return;
    evaluateAnswer(userInput.trim());
  };

  const advanceToNextTurn = () => {
    if (!scenario) return;
    setFeedback(null);
    setHintsRevealed(0);
    setRetryCount(0);
    setUserInput("");

    const nextIndex = currentTurnIndex + 1;
    if (nextIndex >= scenario.dialogue.length) {
      // Done with practice
      setPhase("free-talk");
      return;
    }
    setCurrentTurnIndex(nextIndex);

    // If next turn is AI, auto-play TTS with appropriate voice
    const nextTurn = scenario.dialogue[nextIndex];
    if (nextTurn.speaker === "ai") {
      playTTS(nextTurn.persian, getTurnVoiceOptions(nextTurn));
    }
  };

  const handleRetry = () => {
    setFeedback(null);
    setUserInput("");
    setRetryCount((prev) => prev + 1);
  };

  // --- Listen Phase ---
  const playAllDialogue = async () => {
    if (!scenario) return;
    for (let i = 0; i < scenario.dialogue.length; i++) {
      setListenIndex(i);
      const turn = scenario.dialogue[i];
      await playTTS(turn.persian, getTurnVoiceOptions(turn));
      await new Promise((r) => setTimeout(r, 500));
    }
    setListenIndex(-1);
  };

  // --- Free Talk ---
  const sendFreeTalkMessage = async (text: string) => {
    if (!text.trim() || !scenario) return;
    const userMsg = { role: "user" as const, content: text.trim() };
    const msgs = [...freeTalkMessages, userMsg];
    setFreeTalkMessages(msgs);
    setFreeTalkInput("");
    setFreeTalkLoading(true);
    setFreeTalkTurns((prev) => prev + 1);

    try {
      const res = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgs.map((m) => ({ role: m.role, content: m.content })),
          mode: "conversation",
          level,
          context: `Continue a conversation about "${scenario.title}" in Persian at ${level} level.`,
        }),
      });
      const data = await res.json();
      setFreeTalkMessages([...msgs, { role: "assistant", content: data.content || "" }]);
    } catch {
      setFreeTalkMessages([...msgs, { role: "assistant", content: "エラーが発生しました。" }]);
    } finally {
      setFreeTalkLoading(false);
    }
  };

  // --- Summary ---
  const getOverallScore = (): number => {
    if (turnResults.length === 0) return 0;
    return Math.round(turnResults.reduce((sum, r) => sum + r.score, 0) / turnResults.length);
  };

  const finishPractice = () => {
    if (selectedScenario) {
      saveResult({
        scenarioId: selectedScenario.id,
        date: new Date().toISOString(),
        level,
        turnResults,
        overallScore: getOverallScore(),
      });
    }
    setPhase("summary");
  };

  const resetToSelect = () => {
    setPhase("select");
    setSelectedScenario(null);
    setScenario(null);
    setCurrentTurnIndex(0);
    setTurnResults([]);
    setFeedback(null);
    setHintsRevealed(0);
    setRetryCount(0);
    setUserInput("");
    setFreeTalkMessages([]);
    setFreeTalkTurns(0);
    setListenIndex(-1);
  };

  // --- Score badge ---
  const scoreBadge = (scenarioId: string) => {
    const score = scores[scenarioId];
    if (score === null || score === undefined) return <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />;
    if (score >= 80) return <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />;
    if (score >= 50) return <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />;
    return <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />;
  };

  // ==================== RENDER ====================

  // Phase 1: SELECT
  if (phase === "select") {
    const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2"];
    return (
      <div className="px-4 pt-6 pb-20">
        <h1 className="text-xl font-bold text-gray-900 mb-1">会話練習</h1>
        <p className="text-sm text-gray-500 mb-4">シナリオを選んでガイド付き練習を始めよう</p>

        <div className="flex gap-2 mb-4">
          {levels.map((l) => (
            <button key={l} onClick={() => setLevel(l)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                level === l ? "bg-rose-500 text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}>
              {l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {getScenariosByLevel(level).map((sc) => (
            <button key={sc.id} onClick={() => { setSelectedScenario(sc); generateScenario(sc); }}
              disabled={loading}
              className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all text-left disabled:opacity-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{sc.icon}</span>
                {scoreBadge(sc.id)}
              </div>
              <p className="font-medium text-gray-900 text-sm">{sc.title}</p>
              <p className="persian-text text-xs text-gray-500 mt-1" dir="rtl">{sc.titlePersian}</p>
            </button>
          ))}
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
              <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-600">シナリオを生成中...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Phase 2: INTRO
  if (phase === "intro" && scenario) {
    return (
      <div className="px-4 pt-6 pb-20">
        <button onClick={resetToSelect} className="text-sm text-gray-500 mb-4 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          戻る
        </button>

        <div className="text-center mb-6">
          <span className="text-4xl mb-2 block">{selectedScenario?.icon}</span>
          <h2 className="text-xl font-bold text-gray-900">{scenario.title}</h2>
          <p className="persian-text text-lg text-gray-600 mt-1" dir="rtl">{scenario.titlePersian}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-rose-100 text-rose-600 text-xs font-medium rounded-full">{scenario.level}</span>
        </div>

        {/* Speaker introduction */}
        {scenario.speakers && scenario.speakers.length > 0 && (
          <div className="bg-indigo-50 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">登場人物</h3>
            <div className="space-y-2">
              {scenario.speakers.map((sp, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg">{sp.gender === "female" ? "👩" : "👨"}</span>
                  <div>
                    <span className="persian-text text-base text-gray-900 font-medium" dir="rtl">{sp.name}</span>
                    <span className="text-sm text-gray-500 ml-2">— {sp.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-700 leading-relaxed">{scenario.description}</p>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">キーボキャブラリー</h3>
          <div className="space-y-2">
            {scenario.vocabulary.map((v, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                <button onClick={() => playTTS(v.persian)}
                  className="w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center shrink-0 transition-colors">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  <span className="persian-text text-base text-gray-900" dir="rtl">{v.persian}</span>
                  <span className="text-emerald-600 text-sm ml-2">({v.romanization})</span>
                </div>
                <span className="text-sm text-gray-500 shrink-0">{v.japanese}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => { setPhase("listen"); setListenIndex(-1); }}
          className="w-full py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-colors">
          スタート
        </button>
      </div>
    );
  }

  // Phase 3: LISTEN
  if (phase === "listen" && scenario) {
    return (
      <div className="px-4 pt-6 pb-20">
        <button onClick={() => setPhase("intro")} className="text-sm text-gray-500 mb-4 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          戻る
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-1">お手本ダイアログ</h2>
        <p className="text-sm text-gray-500 mb-4">まずは聞いてみよう（話者ごとに声が変わります）</p>

        <button onClick={playAllDialogue} disabled={ttsPlaying}
          className="w-full py-2.5 mb-4 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {ttsPlaying ? "再生中..." : "全体を再生"}
        </button>

        <div className="space-y-3">
          {scenario.dialogue.map((turn, i) => {
            const colors = speakerColor(turn);
            return (
              <div key={i}
                className={`p-3 rounded-xl border transition-all ${
                  listenIndex === i ? "border-rose-300 bg-rose-50 shadow-sm" : "border-gray-100 bg-white"
                } ${turn.speaker === "user" ? "ml-8" : "mr-8"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                    {speakerLabel(turn)}
                  </span>
                  {turn.gender && (
                    <span className="text-xs text-gray-400">
                      {turn.gender === "female" ? "♀" : "♂"}
                    </span>
                  )}
                  <button onClick={() => playTurn(turn)} disabled={ttsPlaying}
                    className="w-6 h-6 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center disabled:opacity-50">
                    <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    </svg>
                  </button>
                </div>
                <p className="persian-text text-base text-gray-900" dir="rtl">{turn.persian}</p>
                {turn.romanization && (
                  <p className="text-sm text-emerald-600 mt-0.5">{turn.romanization}</p>
                )}
                <p className="text-sm text-gray-500 mt-0.5">{turn.japanese}</p>
              </div>
            );
          })}
        </div>

        <button onClick={() => { setPhase("practice"); setCurrentTurnIndex(0); const firstTurn = scenario.dialogue[0]; if (firstTurn) playTTS(firstTurn.persian, getTurnVoiceOptions(firstTurn)); }}
          className="w-full py-3 mt-6 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-colors">
          練習を始める
        </button>
      </div>
    );
  }

  // Phase 4: PRACTICE
  if (phase === "practice" && scenario) {
    const turn = scenario.dialogue[currentTurnIndex];
    const isUserTurn = turn?.speaker === "user";
    const progress = ((currentTurnIndex + 1) / scenario.dialogue.length) * 100;

    return (
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        {/* Progress bar */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">{currentTurnIndex + 1} / {scenario.dialogue.length}</span>
            <button onClick={resetToSelect} className="text-xs text-gray-400">終了</button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-rose-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Dialogue history */}
        <div className="flex-1 overflow-y-auto px-4 space-y-3 py-2">
          {scenario.dialogue.slice(0, currentTurnIndex).map((t, i) => (
            <div key={i} className={`p-3 rounded-xl ${t.speaker === "ai" ? "bg-blue-50 mr-8" : "bg-rose-50 ml-8"}`}>
              {t.speakerName && (
                <span className={`text-xs font-medium ${speakerColor(t).text} mb-0.5 block`}>{t.speakerName}</span>
              )}
              <p className="persian-text text-sm text-gray-800" dir="rtl">{t.persian}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.japanese}</p>
            </div>
          ))}

          {turn && !isUserTurn && (
            <div className="p-4 rounded-xl bg-blue-50 mr-8 border border-blue-100">
              <span className={`text-xs font-medium ${speakerColor(turn).text} mb-1 block`}>
                {speakerLabel(turn)} {turn.gender === "female" ? "♀" : "♂"}
              </span>
              <p className="persian-text text-lg text-gray-900" dir="rtl">{turn.persian}</p>
              {turn.romanization && <p className="text-sm text-emerald-600 mt-1">{turn.romanization}</p>}
              <p className="text-sm text-gray-600 mt-1">{turn.japanese}</p>
              <button onClick={() => playTurn(turn)} disabled={ttsPlaying}
                className="mt-2 w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center disabled:opacity-50">
                <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </button>
            </div>
          )}

          {turn && isUserTurn && !feedback && (
            <div className="p-4 rounded-xl bg-rose-50 ml-4 border border-rose-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎤</span>
                <span className="font-semibold text-rose-600">あなたの番！</span>
                {turn.speakerName && (
                  <span className="text-xs text-gray-400">({turn.speakerName}役)</span>
                )}
              </div>
              <p className="text-sm text-gray-700 mb-3">{turn.japanese}</p>

              {/* Hints */}
              {turn.hints && turn.hints.length > 0 && (
                <div className="mb-3">
                  {turn.hints.slice(0, hintsRevealed).map((hint, i) => (
                    <p key={i} className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mb-1">
                      💡 {hint}
                    </p>
                  ))}
                  {hintsRevealed < turn.hints.length && (
                    <button onClick={() => setHintsRevealed((prev) => prev + 1)}
                      className="text-xs text-amber-500 hover:text-amber-600">
                      ヒントを見る ({hintsRevealed}/{turn.hints.length})
                    </button>
                  )}
                </div>
              )}

              {/* Mic button */}
              <div className="flex flex-col items-center gap-3 mb-3">
                <button
                  onClick={() => isRecording ? stopRecording() : startRecording()}
                  disabled={evaluating || transcribing}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    isRecording ? "bg-red-500 text-white scale-110 animate-pulse"
                    : "bg-rose-500 text-white hover:bg-rose-600"
                  } disabled:opacity-50`}>
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </button>
                <p className="text-xs text-gray-400">
                  {isRecording ? "録音中...タップで停止" : transcribing ? "認識中..." : "タップして話す"}
                </p>
              </div>

              {/* Text input fallback */}
              <div className="flex gap-2">
                <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSubmitAnswer()}
                  placeholder="テキストでも入力可" dir="auto"
                  className="flex-1 p-2.5 rounded-lg border border-gray-200 bg-white text-sm" />
                <button onClick={handleSubmitAnswer} disabled={!userInput.trim() || evaluating}
                  className="px-4 py-2.5 bg-rose-500 text-white rounded-lg font-medium text-sm hover:bg-rose-600 disabled:opacity-50 transition-colors">
                  {evaluating ? "..." : "送信"}
                </button>
              </div>
            </div>
          )}

          {/* Feedback card */}
          {feedback && turn && isUserTurn && (
            <div className={`p-4 rounded-xl ml-4 border ${
              feedback.score >= 80 ? "bg-green-50 border-green-200" :
              feedback.score >= 50 ? "bg-yellow-50 border-yellow-200" :
              "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  {feedback.score >= 80 ? "🎉" : feedback.score >= 50 ? "👍" : "💪"}
                </span>
                <span className={`font-bold text-lg ${
                  feedback.score >= 80 ? "text-green-600" :
                  feedback.score >= 50 ? "text-yellow-600" :
                  "text-red-600"
                }`}>
                  {feedback.score >= 80 ? "すばらしい！" :
                   feedback.score >= 50 ? "いい感じ！" : "もう一度！"}
                </span>
                <span className={`ml-auto text-xl font-bold ${
                  feedback.score >= 80 ? "text-green-500" :
                  feedback.score >= 50 ? "text-yellow-500" :
                  "text-red-500"
                }`}>{feedback.score}%</span>
              </div>

              <p className="text-sm text-gray-700 mb-2">{feedback.feedback}</p>

              {feedback.correction && (
                <div className="bg-white/60 rounded-lg p-2 mb-2">
                  <p className="text-xs text-gray-500 mb-1">修正案:</p>
                  <p className="persian-text text-base text-gray-900" dir="rtl">{feedback.correction}</p>
                </div>
              )}

              <div className="bg-white/60 rounded-lg p-2 mb-3">
                <p className="text-xs text-gray-500 mb-1">正解:</p>
                <p className="persian-text text-base text-gray-900" dir="rtl">{turn.persian}</p>
                {turn.romanization && <p className="text-sm text-emerald-600">{turn.romanization}</p>}
                <button onClick={() => playTurn(turn)} disabled={ttsPlaying}
                  className="mt-1 text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                  </svg>
                  聞く
                </button>
              </div>

              <div className="flex gap-2">
                {feedback.score < 50 && retryCount < 2 ? (
                  <>
                    <button onClick={handleRetry}
                      className="flex-1 py-2.5 bg-rose-500 text-white rounded-lg font-medium text-sm hover:bg-rose-600">
                      もう一度
                    </button>
                    <button onClick={advanceToNextTurn}
                      className="py-2.5 px-4 bg-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-300">
                      スキップ
                    </button>
                  </>
                ) : (
                  <button onClick={advanceToNextTurn}
                    className="flex-1 py-2.5 bg-rose-500 text-white rounded-lg font-medium text-sm hover:bg-rose-600">
                    次へ
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Auto-advance for AI turns */}
          {turn && !isUserTurn && (
            <div className="flex justify-center">
              <button onClick={advanceToNextTurn}
                className="py-2 px-6 bg-rose-500 text-white rounded-full text-sm font-medium hover:bg-rose-600 transition-colors">
                次へ
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    );
  }

  // Phase 5: FREE TALK
  if (phase === "free-talk" && scenario) {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-lg font-bold text-gray-900">自由練習</h2>
          <p className="text-sm text-gray-500">同じテーマで自由に会話してみよう（2-3往復）</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-3 py-2">
          {freeTalkMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === "user" ? "bg-rose-500 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {freeTalkLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-white border-t border-gray-200">
          {freeTalkTurns >= 3 ? (
            <button onClick={finishPractice}
              className="w-full py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-colors">
              まとめへ
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="text" value={freeTalkInput} onChange={(e) => setFreeTalkInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && sendFreeTalkMessage(freeTalkInput)}
                  placeholder="ペルシア語で話してみよう..." dir="auto"
                  className="flex-1 p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm" disabled={freeTalkLoading} />
                <button onClick={() => sendFreeTalkMessage(freeTalkInput)} disabled={freeTalkLoading || !freeTalkInput.trim()}
                  className="px-4 rounded-xl bg-rose-500 text-white font-medium hover:bg-rose-600 disabled:opacity-50 transition-colors">
                  送信
                </button>
              </div>
              <button onClick={finishPractice}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
                スキップしてまとめへ
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Phase 6: SUMMARY
  if (phase === "summary" && scenario) {
    const overall = getOverallScore();
    const userTurnResults = turnResults;
    const weakPhrases = userTurnResults.filter((r) => r.score < 70);

    return (
      <div className="px-4 pt-6 pb-20">
        <h2 className="text-xl font-bold text-gray-900 text-center mb-6">練習結果</h2>

        {/* Score circle */}
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none"
                stroke={overall >= 80 ? "#22c55e" : overall >= 50 ? "#eab308" : "#ef4444"}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(overall / 100) * 314} 314`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className={`text-3xl font-bold ${
                  overall >= 80 ? "text-green-500" : overall >= 50 ? "text-yellow-500" : "text-red-500"
                }`}>{overall}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Turn results */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">ターン別結果</h3>
          <div className="space-y-2">
            {userTurnResults.map((r, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                r.score >= 80 ? "border-green-200 bg-green-50" :
                r.score >= 50 ? "border-yellow-200 bg-yellow-50" :
                "border-red-200 bg-red-50"
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">ターン {r.turnIndex + 1}</span>
                  <span className={`font-bold text-sm ${
                    r.score >= 80 ? "text-green-600" : r.score >= 50 ? "text-yellow-600" : "text-red-600"
                  }`}>{r.score}%</span>
                </div>
                <p className="persian-text text-sm text-gray-800" dir="rtl">{r.expectedText}</p>
                <p className="text-xs text-gray-500 mt-1">あなた: <span dir="rtl">{r.userText}</span></p>
              </div>
            ))}
          </div>
        </div>

        {/* Weak phrases */}
        {weakPhrases.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">復習フレーズ</h3>
            <div className="space-y-2">
              {weakPhrases.map((r, i) => {
                const turn = scenario.dialogue[r.turnIndex];
                return (
                  <div key={i} className="p-3 bg-white rounded-lg border border-gray-100 flex items-center gap-3">
                    <button onClick={() => { if (turn) playTurn(turn); else playTTS(r.expectedText); }}
                      className="w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                      </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="persian-text text-sm text-gray-900" dir="rtl">{r.expectedText}</p>
                      {turn?.romanization && <p className="text-xs text-emerald-600">{turn.romanization}</p>}
                      <p className="text-xs text-gray-500">{turn?.japanese}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => { resetToSelect(); setSelectedScenario(selectedScenario); if (selectedScenario) generateScenario(selectedScenario); }}
            className="flex-1 py-3 bg-white border border-rose-300 text-rose-600 font-semibold rounded-xl hover:bg-rose-50 transition-colors">
            もう一度
          </button>
          <button onClick={resetToSelect}
            className="flex-1 py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-colors">
            別のシナリオ
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="px-4 pt-6">
      <p className="text-gray-500">読み込み中...</p>
    </div>
  );
}
