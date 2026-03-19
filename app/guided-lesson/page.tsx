"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getLessonById,
  getLessonsByLevel,
  getNextLesson,
  saveLessonProgress,
  type LessonStep,
  type Lesson,
} from "@/lib/guided-lessons";
import { getCEFRProgress } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import { useTTS } from "@/lib/use-tts";
import { recordActivity } from "@/lib/streak";
import { createNewCard, getAllCards, saveAllCards } from "@/lib/srs";
import { addXP } from "@/lib/xp";
import { recordMistake } from "@/lib/mistake-tracker";
import { normalizePersian, levenshteinDistance, getSimilarity } from "@/lib/persian-utils";

// States: speak steps require user action to proceed
type StepState = "playing" | "ready" | "recording" | "checking" | "success" | "fail";

const PASS_THRESHOLD = 60;

export default function GuidedLessonPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-6 text-center text-gray-400">...</div>}>
      <GuidedLessonContent />
    </Suspense>
  );
}

function GuidedLessonContent() {
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("id");

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepState, setStepState] = useState<StepState>("playing");
  const [completed, setCompleted] = useState(false);
  const [praiseText, setPraiseText] = useState("");
  const [lastScore, setLastScore] = useState(0);

  // Interactive step states
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [reorderBuilt, setReorderBuilt] = useState<string[]>([]);
  const [reorderAvailable, setReorderAvailable] = useState<string[]>([]);
  const [dictationInput, setDictationInput] = useState("");
  const [interactiveResult, setInteractiveResult] = useState<"correct" | "wrong" | null>(null);
  const [speakAttempts, setSpeakAttempts] = useState(0);

  const { isRecording, isTranscribing, transcribedText, startRecording, stopRecording, clearText } = useAudioRecorder();
  const { isPlaying, play: playTTS, playJa: playJaTTS, unlock: unlockAudio } = useTTS();
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const level = getCEFRProgress().currentLevel;
    if (lessonId) {
      const found = getLessonById(lessonId);
      if (found) { setLesson(found); return; }
    }
    const next = getNextLesson(level);
    if (next) setLesson(next);
  }, [lessonId]);

  const currentStep: LessonStep | null = lesson ? lesson.steps[stepIndex] ?? null : null;
  const totalSteps = lesson?.steps.length ?? 0;
  const progress = totalSteps > 0 ? ((stepIndex) / totalSteps) * 100 : 0;

  useEffect(() => {
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, []);

  const resetInteractive = useCallback(() => {
    setChosenIndex(null);
    setReorderBuilt([]);
    setReorderAvailable([]);
    setDictationInput("");
    setInteractiveResult(null);
    setPraiseText("");
    setLastScore(0);
    setSpeakAttempts(0);
  }, []);

  // ─── Step Flow ───
  // Each step type: play audio → require user action → feedback → advance
  useEffect(() => {
    if (!currentStep || !hasStarted.current) return;
    resetInteractive();

    const step = currentStep;

    if (step.type === "tip") {
      // Tip: read Japanese explanation → play Persian phrase → auto-advance
      setStepState("playing");
      playJaTTS(step.tipText || step.translation).then(() => {
        return playTTS(step.phrase);
      }).then(() => {
        autoTimer.current = setTimeout(() => goNext(), 1500);
      });
    } else if (step.type === "listen") {
      // Listen: play phrase, show meaning, auto-advance
      setStepState("playing");
      playTTS(step.phrase).then(() => {
        autoTimer.current = setTimeout(() => goNext(), 1500);
      });
    } else if (step.type === "speak" || step.type === "speak-cloze") {
      // Speak: play model → user MUST record → score → advance only on pass
      setStepState("playing");
      playTTS(step.phrase).then(() => {
        setStepState("ready");
      });
    } else if (step.type === "choose") {
      setStepState("playing");
      playTTS(step.phrase).then(() => {
        setStepState("ready");
      });
    } else if (step.type === "reorder") {
      setStepState("ready");
      if (step.words) setReorderAvailable([...step.words]);
    } else if (step.type === "dictation") {
      setStepState("playing");
      playTTS(step.phrase).then(() => {
        setStepState("ready");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, hasStarted.current]);

  // Recording stopped → checking
  useEffect(() => {
    if (stepState !== "recording" || isRecording) return;
    setStepState("checking");
  }, [isRecording, stepState]);

  // Whisper result → always give feedback, always advance
  // Speak app style: you spoke → feedback → move on. Weak items go to SRS.
  useEffect(() => {
    if (stepState !== "checking" || isTranscribing) return;
    const heard = transcribedText || "";
    const attempt = speakAttempts + 1;
    setSpeakAttempts(attempt);

    if (heard && currentStep) {
      const score = getSimilarity(
        currentStep.phrase, heard,
        currentStep.type === "speak-cloze" ? "cloze" : "full",
        currentStep.clozeWord
      );
      setLastScore(score);
      addXP("lessonStep");

      if (score >= 70) {
        // Great — advance
        setPraiseText(currentStep.praiseText || "آفرین!");
        setStepState("success");
        autoTimer.current = setTimeout(() => goNext(), 1800);
      } else if (score >= 30 || attempt >= 2) {
        // OK or 2nd attempt — show feedback and advance
        setPraiseText(score >= 30 ? "خوبه! 👍" : "👏");
        setStepState("success");
        if (score < PASS_THRESHOLD) {
          recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson", score);
        }
        autoTimer.current = setTimeout(() => goNext(), 2000);
      } else {
        // Low score, first attempt — let user try once more
        setPraiseText("");
        setStepState("fail");
        recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson", score);
      }
    } else {
      // Nothing heard
      if (attempt >= 2) {
        // Tried twice, advance anyway
        setPraiseText("👏");
        setStepState("success");
        autoTimer.current = setTimeout(() => goNext(), 1500);
      } else {
        setStepState("fail");
      }
    }
    clearText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranscribing, stepState]);

  // Safety: Whisper timeout (8s) → treat as fail
  useEffect(() => {
    if (stepState !== "checking") return;
    const t = setTimeout(() => { setStepState("fail"); clearText(); }, 8000);
    return () => clearTimeout(t);
  }, [stepState, clearText]);

  const goNext = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (!lesson) return;
    const nextIdx = stepIndex + 1;
    if (nextIdx >= lesson.steps.length) {
      saveLessonProgress(lesson.id, lesson.steps.length, lesson.steps.length);
      recordActivity();
      addXP("sessionComplete");
      setCompleted(true);
    } else {
      setStepIndex(nextIdx);
    }
  }, [lesson, stepIndex]);

  const handleStart = () => {
    unlockAudio();
    hasStarted.current = true;
    // Trigger first step
    const step = lesson?.steps[0];
    if (!step) return;
    resetInteractive();
    if (step.type === "tip") {
      setStepState("playing");
      playJaTTS(step.tipText || step.translation).then(() => {
        return playTTS(step.phrase);
      }).then(() => {
        autoTimer.current = setTimeout(() => goNext(), 1500);
      });
    } else if (step.type === "listen") {
      setStepState("playing");
      playTTS(step.phrase).then(() => {
        autoTimer.current = setTimeout(() => goNext(), 1500);
      });
    } else if (step.type === "speak" || step.type === "speak-cloze") {
      setStepState("playing");
      playTTS(step.phrase).then(() => setStepState("ready"));
    } else if (step.type === "choose") {
      setStepState("playing");
      playTTS(step.phrase).then(() => setStepState("ready"));
    } else if (step.type === "reorder") {
      setStepState("ready");
      if (step.words) setReorderAvailable([...step.words]);
    } else if (step.type === "dictation") {
      setStepState("playing");
      playTTS(step.phrase).then(() => setStepState("ready"));
    }
  };

  const handleRecord = () => {
    unlockAudio();
    if (stepState === "ready" || stepState === "fail") {
      startRecording();
      setStepState("recording");
    } else if (stepState === "recording") {
      stopRecording();
    }
  };

  // Choose
  const handleChoose = (index: number) => {
    if (!currentStep || interactiveResult !== null) return;
    setChosenIndex(index);
    const correct = index === currentStep.correctChoiceIndex;
    setInteractiveResult(correct ? "correct" : "wrong");
    addXP("lessonStep");
    if (correct) {
      addXP("exerciseCorrect");
      setPraiseText("آفرین!");
      autoTimer.current = setTimeout(() => goNext(), 1500);
    } else {
      recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson", 0);
      // Show correct answer, then advance after delay
      autoTimer.current = setTimeout(() => goNext(), 2500);
    }
  };

  // Reorder
  const addReorderWord = (word: string, i: number) => {
    setReorderBuilt([...reorderBuilt, word]);
    const next = [...reorderAvailable]; next.splice(i, 1); setReorderAvailable(next);
  };
  const removeReorderWord = (i: number) => {
    const word = reorderBuilt[i];
    const next = [...reorderBuilt]; next.splice(i, 1); setReorderBuilt(next);
    setReorderAvailable([...reorderAvailable, word]);
  };
  const checkReorder = () => {
    if (!currentStep) return;
    const correct = normalizePersian(reorderBuilt.join(" ")) === normalizePersian(currentStep.phrase);
    setInteractiveResult(correct ? "correct" : "wrong");
    addXP("lessonStep");
    if (correct) { addXP("exerciseCorrect"); setPraiseText("آفرین!"); }
    else { recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson", 0); }
    autoTimer.current = setTimeout(() => goNext(), 2000);
  };

  // Dictation
  const checkDictation = () => {
    if (!currentStep) return;
    const n = normalizePersian(dictationInput);
    const e = normalizePersian(currentStep.phrase);
    const dist = levenshteinDistance(n, e);
    const sim = Math.max(e.length, 1);
    const correct = (sim - dist) / sim >= 0.7;
    setInteractiveResult(correct ? "correct" : "wrong");
    addXP("lessonStep");
    if (correct) { addXP("exerciseCorrect"); setPraiseText("آفرین!"); }
    else { recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson", 0); }
    autoTimer.current = setTimeout(() => goNext(), 2000);
  };

  const handleAddToSRS = useCallback(() => {
    if (!lesson) return;
    const cards = getAllCards();
    for (const step of lesson.steps.filter((s) => s.type === "speak" || s.type === "speak-cloze")) {
      if (!cards[step.phrase]) cards[step.phrase] = createNewCard(step.phrase);
    }
    saveAllCards(cards);
    alert("フレーズをSRSに追加しました！");
  }, [lesson]);

  // ─── RENDER ───

  if (!lesson) {
    return (
      <div className="px-4 pt-6 pb-8 text-center">
        <p className="text-gray-500">レッスンが見つかりません</p>
        <Link href="/" className="text-emerald-600 text-sm mt-2 inline-block">ホームへ</Link>
      </div>
    );
  }

  // Start screen
  if (!hasStarted.current) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-4xl mb-6">👩‍🏫</div>
          <h1 className="text-xl font-black text-gray-900 mb-2">{lesson.title}</h1>
          <p className="persian-text text-lg text-gray-500 mb-6" dir="rtl">{lesson.titlePersian}</p>
          <p className="text-gray-400 text-sm mb-8">{totalSteps}ステップ</p>
          <button onClick={handleStart}
            className="w-full max-w-xs py-4 rounded-2xl bg-purple-600 text-white font-bold text-lg shadow-xl shadow-purple-200 active:scale-95 transition-transform">
            レッスンを始める
          </button>
        </div>
        <div className="px-4 pb-6">
          <Link href="/" className="block text-center text-gray-400 text-sm">ホームへ戻る</Link>
        </div>
      </div>
    );
  }

  // Completion
  if (completed) {
    const speakSteps = lesson.steps.filter((s) => s.type === "speak" || s.type === "speak-cloze");
    const nextLesson = (() => {
      const ll = getLessonsByLevel(lesson.level);
      const idx = ll.findIndex((l) => l.id === lesson.id);
      return idx >= 0 && idx < ll.length - 1 ? ll[idx + 1] : null;
    })();

    return (
      <div className="px-5 pt-8 pb-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">レッスン完了！</h1>
          <p className="text-gray-500">{speakSteps.length}フレーズ練習しました</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 space-y-3">
          {speakSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 pb-2 border-b border-gray-50 last:border-0">
              <button onClick={() => { unlockAudio(); playTTS(step.phrase); }}
                className="shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </button>
              <div className="flex-1 min-w-0">
                <p className="persian-text text-sm font-bold text-gray-900" dir="rtl">{step.phrase}</p>
                <p className="text-xs text-gray-400">{step.translation}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <button onClick={handleAddToSRS} className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold">SRSに追加</button>
          {nextLesson && (
            <Link href={`/guided-lesson?id=${nextLesson.id}`} className="block w-full py-3.5 rounded-2xl bg-purple-600 text-white font-bold text-center">次のレッスンへ</Link>
          )}
          <Link href="/" className="block w-full py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-bold text-center">ホームへ</Link>
        </div>
      </div>
    );
  }

  // ─── Active Lesson ───

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Progress bar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href="/" className="text-gray-400 text-xl">×</Link>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-gray-400">{stepIndex + 1}/{totalSteps}</span>
      </div>

      {/* Main content area */}
      <div className="flex-1 px-5 py-6 flex flex-col items-center justify-center">

        {/* ═══ TIP ═══ */}
        {currentStep?.type === "tip" && (
          <div className="w-full max-w-sm animate-slide-in text-center">
            <span className="px-4 py-1.5 bg-blue-100 text-blue-700 text-xs rounded-full font-bold mb-4 inline-block">ポイント</span>
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <p className="text-gray-700 leading-relaxed text-sm">{currentStep.tipText}</p>
            </div>
            <p className="persian-text text-2xl font-bold text-gray-900 mb-2" dir="rtl">{currentStep.phrase}</p>
            <p className="text-sm text-gray-500">{currentStep.translation}</p>
          </div>
        )}

        {/* ═══ LISTEN ═══ */}
        {currentStep?.type === "listen" && (
          <div className="animate-slide-in text-center">
            <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold mb-4 inline-block">聞いてみよう</span>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isPlaying ? "bg-emerald-500 animate-pulse" : "bg-emerald-100"}`}>
              <svg className={`w-8 h-8 ${isPlaying ? "text-white" : "text-emerald-600"}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            </div>
            <p className="persian-text text-2xl font-bold text-gray-900 mb-2" dir="rtl">{currentStep.phrase}</p>
            <p className="text-sm text-gray-500">{currentStep.translation}</p>
          </div>
        )}

        {/* ═══ SPEAK / SPEAK-CLOZE ═══ */}
        {(currentStep?.type === "speak" || currentStep?.type === "speak-cloze") && (
          <div className="animate-slide-in w-full max-w-sm text-center">
            <span className="px-4 py-1.5 bg-purple-100 text-purple-700 text-xs rounded-full font-bold mb-4 inline-block">
              声に出そう
            </span>

            {/* Show phrase — Persian script only */}
            {currentStep.type === "speak-cloze" && currentStep.clozeWord ? (
              <div>
                <p className="persian-text text-2xl font-bold text-gray-900 mb-2" dir="rtl">
                  {currentStep.phrase.split(currentStep.clozeWord)[0]}
                  <span className="bg-yellow-200 text-yellow-800 px-2 rounded-lg mx-1">____</span>
                  {currentStep.phrase.split(currentStep.clozeWord).slice(1).join(currentStep.clozeWord)}
                </p>
                <p className="text-sm text-gray-500">{currentStep.translation}</p>
              </div>
            ) : (
              <div>
                <p className="persian-text text-2xl font-bold text-gray-900 mb-2" dir="rtl">{currentStep.phrase}</p>
                <p className="text-sm text-gray-500">{currentStep.translation}</p>
              </div>
            )}

            {/* Score feedback */}
            {stepState === "success" && (
              <div className="mt-4 animate-bounce">
                <span className="persian-text text-3xl text-emerald-500 font-black">{praiseText}</span>
                <p className="text-sm text-emerald-600 mt-1">{lastScore}%</p>
              </div>
            )}

            {stepState === "fail" && (
              <div className="mt-4 bg-amber-50 rounded-xl p-3">
                <p className="text-amber-700 font-bold text-sm">もう一度！</p>
                {lastScore > 0 && <p className="text-amber-600 text-xs">{lastScore}% — {PASS_THRESHOLD}%以上で合格</p>}
                <p className="text-xs text-gray-400 mt-1">マイクをタップしてもう一度話してみよう</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ CHOOSE (4択) ═══ */}
        {currentStep?.type === "choose" && (
          <div className="animate-slide-in w-full max-w-sm text-center">
            <span className="px-4 py-1.5 bg-pink-100 text-pink-700 text-xs rounded-full font-bold mb-4 inline-block">意味を選ぼう</span>
            <p className="persian-text text-2xl font-bold text-gray-900 mb-4" dir="rtl">{currentStep.phrase}</p>
            {stepState !== "playing" && (
              <div className="space-y-2">
                {currentStep.choices?.map((choice, i) => {
                  let cls = "bg-white border-gray-200 text-gray-700";
                  if (interactiveResult !== null) {
                    if (i === currentStep.correctChoiceIndex) cls = "bg-emerald-50 border-emerald-300 text-emerald-800";
                    else if (i === chosenIndex && i !== currentStep.correctChoiceIndex) cls = "bg-red-50 border-red-300 text-red-800";
                  }
                  return (
                    <button key={i} onClick={() => handleChoose(i)} disabled={interactiveResult !== null}
                      className={`w-full p-3 rounded-xl border text-left transition-all active:scale-95 ${cls}`}>
                      {choice}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ REORDER ═══ */}
        {currentStep?.type === "reorder" && (
          <div className="animate-slide-in w-full max-w-sm text-center">
            <span className="px-4 py-1.5 bg-amber-100 text-amber-700 text-xs rounded-full font-bold mb-4 inline-block">並べ替えよう</span>
            <p className="text-sm text-gray-600 mb-4">{currentStep.translation}</p>
            <div className="min-h-[52px] p-3 bg-amber-50 rounded-xl border-2 border-dashed border-amber-200 mb-4 flex flex-wrap gap-2" dir="rtl">
              {reorderBuilt.length === 0 && <span className="text-amber-300 text-sm">ここに単語が並びます</span>}
              {reorderBuilt.map((w, i) => (
                <button key={`b-${i}`} onClick={() => removeReorderWord(i)}
                  className="px-3 py-1.5 bg-amber-200 text-amber-900 rounded-lg persian-text text-lg active:scale-95">{w}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-4 justify-center" dir="rtl">
              {reorderAvailable.map((w, i) => (
                <button key={`a-${i}`} onClick={() => addReorderWord(w, i)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg persian-text text-lg active:scale-95 shadow-sm">{w}</button>
              ))}
            </div>
            {interactiveResult && (
              <div className={`rounded-xl p-3 text-sm font-semibold ${interactiveResult === "correct" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {interactiveResult === "correct" ? "正解!" : "不正解"}
                {interactiveResult === "wrong" && <p className="persian-text text-base text-gray-800 mt-1 font-normal" dir="rtl">{currentStep.phrase}</p>}
              </div>
            )}
          </div>
        )}

        {/* ═══ DICTATION ═══ */}
        {currentStep?.type === "dictation" && (
          <div className="animate-slide-in w-full max-w-sm text-center">
            <span className="px-4 py-1.5 bg-cyan-100 text-cyan-700 text-xs rounded-full font-bold mb-4 inline-block">書き取り</span>
            <p className="text-sm text-gray-500 mb-2">{currentStep.translation}</p>
            {stepState !== "playing" && (
              <>
                <button onClick={() => playTTS(currentStep.phrase)} disabled={isPlaying}
                  className="text-xs text-cyan-500 mb-4 inline-block">もう一度聞く</button>
                <input type="text" value={dictationInput} onChange={(e) => setDictationInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !interactiveResult && checkDictation()}
                  placeholder="ペルシア語で入力..." className="w-full p-3 rounded-lg border border-gray-200 bg-white text-lg persian-text mb-3"
                  dir="rtl" disabled={interactiveResult !== null} />
                {interactiveResult && (
                  <div className={`rounded-xl p-3 text-sm ${interactiveResult === "correct" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    <p className="font-semibold">{interactiveResult === "correct" ? "正解!" : "不正解"}</p>
                    <p className="persian-text text-base text-gray-800 mt-1" dir="rtl">{currentStep.phrase}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── Bottom Actions ─── */}
      <div className="px-5 pb-8 space-y-3">

        {/* SPEAK: Big mic button — THE primary action */}
        {(currentStep?.type === "speak" || currentStep?.type === "speak-cloze") && (stepState === "ready" || stepState === "recording" || stepState === "fail") && (
          <>
            <button onClick={handleRecord}
              className={`w-full py-5 rounded-2xl font-bold text-lg transition-all ${
                stepState === "recording"
                  ? "bg-red-500 text-white mic-recording"
                  : "bg-purple-600 text-white shadow-lg shadow-purple-200 active:scale-95"
              }`}>
              {stepState === "recording" ? "🎙️ 録音中...タップで停止" :
               stepState === "fail" ? "🎙️ もう一度話す" :
               "🎙️ タップして話す"}
            </button>
            <button onClick={() => playTTS(currentStep!.phrase)} disabled={isPlaying}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium disabled:opacity-30">
              お手本をもう一度聞く
            </button>
          </>
        )}

        {/* SPEAK: checking state */}
        {(currentStep?.type === "speak" || currentStep?.type === "speak-cloze") && stepState === "checking" && (
          <div className="w-full py-5 rounded-2xl bg-gray-200 text-gray-500 font-bold text-lg text-center animate-pulse">
            チェック中...
          </div>
        )}

        {/* REORDER: submit */}
        {currentStep?.type === "reorder" && reorderAvailable.length === 0 && interactiveResult === null && (
          <button onClick={checkReorder}
            className="w-full py-4 rounded-2xl bg-amber-500 text-white font-bold text-lg active:scale-95">
            回答を確認
          </button>
        )}

        {/* DICTATION: submit */}
        {currentStep?.type === "dictation" && stepState !== "playing" && interactiveResult === null && (
          <button onClick={checkDictation} disabled={!dictationInput.trim()}
            className="w-full py-4 rounded-2xl bg-cyan-500 text-white font-bold text-lg active:scale-95 disabled:opacity-50">
            回答する
          </button>
        )}

        {/* TIP/LISTEN: next button (these auto-advance but user can tap to speed up) */}
        {(currentStep?.type === "tip" || currentStep?.type === "listen") && (
          <button onClick={() => { if (autoTimer.current) clearTimeout(autoTimer.current); goNext(); }}
            className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-lg active:scale-95">
            次へ
          </button>
        )}

        {/* CHOOSE: listen again (during ready state) */}
        {currentStep?.type === "choose" && stepState === "ready" && interactiveResult === null && (
          <button onClick={() => playTTS(currentStep.phrase)} disabled={isPlaying}
            className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium disabled:opacity-30">
            もう一度聞く
          </button>
        )}
      </div>
    </div>
  );
}
