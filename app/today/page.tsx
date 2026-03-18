"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { buildTodaySession, type TodaySession } from "@/lib/today-session";
import { useMergedVocabulary } from "@/lib/use-merged-data";
import { useTTS } from "@/lib/use-tts";
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import { recordActivity } from "@/lib/streak";
import { addXP, getTodayXP, getDailyGoal } from "@/lib/xp";
import { getSimilarity } from "@/lib/persian-utils";
import { recordMistake } from "@/lib/mistake-tracker";
import SRSReviewEmbed from "@/components/SRSReviewEmbed";
import Confetti from "@/components/Confetti";

type Phase = "loading" | "srs" | "lesson" | "conversation" | "complete";

export default function TodayPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<TodaySession | null>(null);
  const [completedSubSteps, setCompletedSubSteps] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Lesson embed state
  const [lessonStepIndex, setLessonStepIndex] = useState(0);
  const [lessonStarted, setLessonStarted] = useState(false);

  // Conversation state
  const [convIndex, setConvIndex] = useState(0);
  const [convState, setConvState] = useState<"ready" | "recording" | "checking" | "result">("ready");
  const [convScore, setConvScore] = useState<number | null>(null);

  const { allItems } = useMergedVocabulary("all");
  const { isPlaying, play: playTTS, unlock: unlockAudio } = useTTS();
  const { isRecording, isTranscribing, transcribedText, startRecording, stopRecording, clearText } = useAudioRecorder();
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build vocab map for SRS
  const vocabMap = useCallback(() => {
    const map: Record<string, { japanese: string; romanization: string }> = {};
    for (const item of allItems) {
      map[item.ペルシア語] = { japanese: item.日本語, romanization: item.ローマ字 };
    }
    return map;
  }, [allItems]);

  useEffect(() => {
    const s = buildTodaySession();
    setSession(s);

    // Skip empty phases
    if (s.srsCards.length > 0) {
      setPhase("srs");
    } else if (s.lesson) {
      setPhase("lesson");
    } else if (s.conversationPhrases.length > 0) {
      setPhase("conversation");
    } else {
      setPhase("complete");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, []);

  const totalSubSteps = session?.totalSubSteps ?? 1;
  const progressPercent = Math.min((completedSubSteps / totalSubSteps) * 100, 100);

  // --- SRS Phase Complete ---
  const handleSRSComplete = (reviewed: number, xp: number) => {
    setCompletedSubSteps((prev) => prev + reviewed);
    setXpEarned((prev) => prev + xp);
    recordActivity();

    if (session?.lesson) {
      setPhase("lesson");
    } else if (session && session.conversationPhrases.length > 0) {
      setPhase("conversation");
    } else {
      finishSession();
    }
  };

  // --- Lesson Phase ---
  const handleStartLesson = () => {
    unlockAudio();
    setLessonStarted(true);
    if (session?.lesson) {
      const step = session.lesson.steps[0];
      if (step) playTTS(step.phrase);
    }
  };

  const advanceLessonStep = useCallback(() => {
    if (!session?.lesson) return;
    const nextIdx = lessonStepIndex + 1;
    addXP("lessonStep");
    setXpEarned((prev) => prev + 10);
    setCompletedSubSteps((prev) => prev + 1);

    if (nextIdx >= session.lesson.steps.length) {
      // Lesson done
      addXP("sessionComplete");
      recordActivity();
      if (session.conversationPhrases.length > 0) {
        setPhase("conversation");
      } else {
        finishSession();
      }
    } else {
      setLessonStepIndex(nextIdx);
      const nextStep = session.lesson.steps[nextIdx];
      if (nextStep) playTTS(nextStep.phrase);
    }
  }, [session, lessonStepIndex]);

  // --- Conversation Phase ---
  const currentPhrase = session?.conversationPhrases[convIndex];

  const handleConvRecord = () => {
    unlockAudio();
    if (convState === "ready") {
      startRecording();
      setConvState("recording");
    } else if (convState === "recording") {
      stopRecording();
      setConvState("checking");
    }
  };

  // Watch for transcription result
  useEffect(() => {
    if (convState !== "checking" || isTranscribing) return;

    const heard = transcribedText || "";
    if (heard && currentPhrase) {
      const score = getSimilarity(currentPhrase.persian, heard);
      setConvScore(score);
      addXP("conversationTurn");
      setXpEarned((prev) => prev + 15);

      if (score < 50) {
        recordMistake(currentPhrase.persian, currentPhrase.romanization, currentPhrase.japanese, "conversation", score);
      }
    } else {
      setConvScore(50); // default if nothing heard
    }

    setConvState("result");
    setCompletedSubSteps((prev) => prev + 1);
    clearText();
  }, [isTranscribing, convState, transcribedText, currentPhrase, clearText]);

  // Safety timeout for checking
  useEffect(() => {
    if (convState !== "checking") return;
    const t = setTimeout(() => {
      setConvScore(50);
      setConvState("result");
      setCompletedSubSteps((prev) => prev + 1);
      clearText();
    }, 6000);
    return () => clearTimeout(t);
  }, [convState, clearText]);

  const advanceConv = () => {
    if (!session) return;
    const nextIdx = convIndex + 1;
    if (nextIdx >= session.conversationPhrases.length) {
      finishSession();
    } else {
      setConvIndex(nextIdx);
      setConvState("ready");
      setConvScore(null);
      playTTS(session.conversationPhrases[nextIdx].persian);
    }
  };

  const finishSession = () => {
    recordActivity();
    setShowConfetti(true);
    setPhase("complete");
  };

  // --- Render ---

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 animate-pulse">セッションを準備中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Confetti show={showConfetti} />

      {/* Top bar */}
      {phase !== "complete" && (
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <Link href="/" className="text-gray-400 text-xl">×</Link>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-xs text-amber-500 font-bold">⚡{xpEarned}</span>
        </div>
      )}

      {/* Phase indicator */}
      {phase !== "complete" && (
        <div className="flex justify-center gap-3 px-4 py-2">
          {session && session.srsCards.length > 0 && (
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              phase === "srs" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"
            }`}>復習</span>
          )}
          {session?.lesson && (
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              phase === "lesson" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-400"
            }`}>レッスン</span>
          )}
          {session && session.conversationPhrases.length > 0 && (
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              phase === "conversation" ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-400"
            }`}>会話</span>
          )}
        </div>
      )}

      {/* === SRS Phase === */}
      {phase === "srs" && session && (
        <div className="flex-1 px-5 py-6">
          <h2 className="text-lg font-bold text-gray-900 text-center mb-1">単語復習</h2>
          <p className="text-sm text-gray-400 text-center mb-6">{session.srsCards.length}枚のカード</p>
          <SRSReviewEmbed
            cards={session.srsCards}
            onComplete={handleSRSComplete}
            vocabMap={vocabMap()}
          />
        </div>
      )}

      {/* === Lesson Phase (simplified inline) === */}
      {phase === "lesson" && session?.lesson && (
        <div className="flex-1 px-5 py-6 flex flex-col items-center justify-center">
          {!lessonStarted ? (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-4xl mb-6 mx-auto">
                🎓
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">{session.lesson.title}</h2>
              <p className="text-sm text-gray-400 mb-6">{session.lesson.steps.length}ステップ</p>
              <button onClick={handleStartLesson}
                className="px-8 py-3 rounded-2xl bg-purple-600 text-white font-bold active:scale-95 transition-transform">
                レッスンを始める
              </button>
              <p className="text-xs text-gray-400 mt-4">
                <Link href={`/guided-lesson?id=${session.lesson.id}`} className="underline">
                  フルレッスンモードで開く
                </Link>
              </p>
            </div>
          ) : (
            <div className="w-full max-w-sm">
              {(() => {
                const step = session.lesson!.steps[lessonStepIndex];
                if (!step) return null;
                const isBeginnerLevel = session.level === "A1" || session.level === "A2";
                return (
                  <div className="animate-slide-in text-center">
                    <span className={`px-4 py-1.5 text-xs rounded-full font-bold mb-4 inline-block ${
                      step.type === "tip" ? "bg-blue-100 text-blue-700" :
                      step.type === "listen" ? "bg-emerald-100 text-emerald-700" :
                      "bg-purple-100 text-purple-700"
                    }`}>
                      {step.type === "tip" ? "ポイント" :
                       step.type === "listen" ? "聞いてみよう" : "声に出そう"}
                    </span>

                    {step.tipText && (
                      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 mt-4">
                        <p className="text-gray-700 text-sm">{step.tipText}</p>
                      </div>
                    )}

                    <div className="mt-4 mb-4">
                      {isBeginnerLevel ? (
                        <>
                          <p className="text-xl font-black text-gray-900 mb-1">{step.romanization}</p>
                          <p className="persian-text text-base text-gray-400" dir="rtl">{step.phrase}</p>
                        </>
                      ) : (
                        <>
                          <p className="persian-text text-xl font-bold text-gray-900 mb-1" dir="rtl">{step.phrase}</p>
                          <p className="text-sm text-gray-400">{step.romanization}</p>
                        </>
                      )}
                      <p className="text-sm text-gray-500 mt-2">{step.translation}</p>
                    </div>

                    <div className="flex gap-2 mt-6">
                      <button onClick={() => playTTS(step.phrase)} disabled={isPlaying}
                        className="flex-1 py-3 rounded-xl bg-emerald-100 text-emerald-700 font-medium text-sm disabled:opacity-50">
                        {isPlaying ? "再生中..." : "もう一度聞く"}
                      </button>
                      <button onClick={advanceLessonStep}
                        className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm active:scale-95 transition-transform">
                        次へ
                      </button>
                    </div>

                    <p className="text-xs text-gray-400 mt-3">
                      {lessonStepIndex + 1}/{session.lesson!.steps.length}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* === Conversation Phase === */}
      {phase === "conversation" && session && currentPhrase && (
        <div className="flex-1 px-5 py-6 flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold text-gray-900 mb-1">フレーズ練習</h2>
          <p className="text-xs text-gray-400 mb-6">{convIndex + 1}/{session.conversationPhrases.length}</p>

          <div className="w-full max-w-sm animate-slide-in">
            {/* Phrase display */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 text-center">
              <p className="text-sm text-gray-500 mb-3">{currentPhrase.japanese}</p>
              {session.level === "A1" || session.level === "A2" ? (
                <>
                  <p className="text-xl font-black text-gray-900 mb-1">{currentPhrase.romanization}</p>
                  <p className="persian-text text-base text-gray-400" dir="rtl">{currentPhrase.persian}</p>
                </>
              ) : (
                <>
                  <p className="persian-text text-xl font-bold text-gray-900 mb-1" dir="rtl">{currentPhrase.persian}</p>
                  <p className="text-sm text-gray-400">{currentPhrase.romanization}</p>
                </>
              )}
            </div>

            {/* Listen button */}
            <button onClick={() => playTTS(currentPhrase.persian)} disabled={isPlaying}
              className="w-full py-2.5 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-medium mb-4 disabled:opacity-50">
              {isPlaying ? "再生中..." : "お手本を聞く"}
            </button>

            {/* Record / result */}
            {convState === "result" && convScore !== null ? (
              <div className={`rounded-2xl p-4 text-center mb-4 ${
                convScore >= 70 ? "bg-emerald-50" : convScore >= 40 ? "bg-amber-50" : "bg-red-50"
              }`}>
                <span className="text-3xl block mb-1">
                  {convScore >= 70 ? "🎉" : convScore >= 40 ? "👍" : "💪"}
                </span>
                <p className={`font-bold ${
                  convScore >= 70 ? "text-emerald-600" : convScore >= 40 ? "text-amber-600" : "text-red-600"
                }`}>
                  {convScore >= 70 ? "すばらしい！" : convScore >= 40 ? "いい感じ！" : "もう一回！"}
                </p>
              </div>
            ) : (
              <button
                onClick={handleConvRecord}
                disabled={convState === "checking"}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                  convState === "recording"
                    ? "bg-red-500 text-white animate-pulse"
                    : convState === "checking"
                    ? "bg-gray-300 text-gray-500"
                    : "bg-purple-600 text-white shadow-lg shadow-purple-200 active:scale-95"
                }`}
              >
                {convState === "recording" ? "タップで停止" :
                 convState === "checking" ? "チェック中..." :
                 "タップして話す"}
              </button>
            )}

            {/* Next / Skip */}
            {convState === "result" && (
              <button onClick={advanceConv}
                className="w-full py-3 rounded-2xl bg-rose-500 text-white font-bold text-sm mt-3 active:scale-95 transition-transform">
                次へ
              </button>
            )}
            {convState === "ready" && (
              <button onClick={advanceConv}
                className="w-full py-2 text-gray-400 text-sm mt-3">
                スキップ
              </button>
            )}
          </div>
        </div>
      )}

      {/* === Complete Phase === */}
      {phase === "complete" && (
        <div className="flex-1 px-5 py-8 flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">🎊</div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">今日の学習完了！</h1>
          <p className="text-gray-500 mb-6">おつかれさまでした</p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-8">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-amber-500">⚡{xpEarned}</p>
              <p className="text-xs text-gray-400">獲得XP</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-emerald-500">{getTodayXP()}/{getDailyGoal()}</p>
              <p className="text-xs text-gray-400">今日のXP</p>
            </div>
          </div>

          {/* Daily goal status */}
          {getTodayXP() >= getDailyGoal() ? (
            <div className="bg-emerald-50 rounded-2xl p-4 text-center mb-6 w-full max-w-xs">
              <p className="text-emerald-700 font-bold">デイリーゴール達成！</p>
            </div>
          ) : (
            <div className="bg-amber-50 rounded-2xl p-4 text-center mb-6 w-full max-w-xs">
              <p className="text-amber-700 text-sm">
                あと <span className="font-bold">{getDailyGoal() - getTodayXP()}</span> XPでゴール達成
              </p>
            </div>
          )}

          <div className="w-full max-w-xs space-y-2">
            <Link href="/today"
              className="block w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-center active:scale-95 transition-transform">
              もう1セッション
            </Link>
            <Link href="/"
              className="block w-full py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-bold text-center active:scale-95 transition-transform">
              ホームへ
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
