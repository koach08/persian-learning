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
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import { useTTS } from "@/lib/use-tts";
import { recordActivity } from "@/lib/streak";
import { createNewCard, getAllCards, saveAllCards } from "@/lib/srs";
import { addXP } from "@/lib/xp";
import { recordMistake } from "@/lib/mistake-tracker";
import { normalizePersian, levenshteinDistance } from "@/lib/persian-utils";

type StepState = "playing" | "ready" | "recording" | "checking" | "feedback";

// Word-level feedback from Whisper transcription matching
interface WordResult {
  word: string; // original Persian word
  matched: boolean;
}

function matchWords(expected: string, spoken: string): WordResult[] {
  const expWords = expected.replace(/\u200c/g, "").split(/\s+/).filter(Boolean);
  const spkNorm = normalizePersian(spoken);
  const spkWords = spkNorm.split(" ").filter(Boolean);

  return expWords.map((ew) => {
    const ewNorm = normalizePersian(ew);
    let best = 0;
    for (const sw of spkWords) {
      if (ewNorm === sw) { best = 1; break; }
      const maxLen = Math.max(ewNorm.length, sw.length);
      if (maxLen > 0) best = Math.max(best, (maxLen - levenshteinDistance(ewNorm, sw)) / maxLen);
    }
    return { word: ew, matched: best >= 0.5 };
  });
}

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

  // Speak feedback
  const [wordResults, setWordResults] = useState<WordResult[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);

  // Interactive step states
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [reorderBuilt, setReorderBuilt] = useState<string[]>([]);
  const [reorderAvailable, setReorderAvailable] = useState<string[]>([]);
  const [dictationInput, setDictationInput] = useState("");
  const [interactiveResult, setInteractiveResult] = useState<"correct" | "wrong" | null>(null);

  // iOS-compatible audio recorder (Whisper)
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

  const resetState = useCallback(() => {
    setChosenIndex(null);
    setReorderBuilt([]);
    setReorderAvailable([]);
    setDictationInput("");
    setInteractiveResult(null);
    setWordResults([]);
    setMatchedCount(0);
  }, []);

  // ─── Step Flow ───
  useEffect(() => {
    if (!currentStep || !hasStarted.current) return;
    resetState();
    const step = currentStep;

    if (step.type === "tip") {
      setStepState("playing");
      playJaTTS(step.tipText || step.translation).then(() => playTTS(step.phrase)).then(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, hasStarted.current]);

  // Recording stopped → checking
  useEffect(() => {
    if (stepState !== "recording" || isRecording) return;
    setStepState("checking");
  }, [isRecording, stepState]);

  // Whisper result → word matching feedback
  useEffect(() => {
    if (stepState !== "checking" || isTranscribing) return;
    const heard = transcribedText || "";

    if (heard && currentStep) {
      const results = matchWords(currentStep.phrase, heard);
      setWordResults(results);
      const matched = results.filter((r) => r.matched).length;
      setMatchedCount(matched);
      addXP("lessonStep");

      if (matched < results.length * 0.5) {
        recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson",
          Math.round((matched / Math.max(results.length, 1)) * 100));
      }
    } else {
      // Nothing heard — show phrase as all unmatched
      if (currentStep) {
        const words = currentStep.phrase.replace(/\u200c/g, "").split(/\s+/).filter(Boolean);
        setWordResults(words.map((w) => ({ word: w, matched: false })));
      }
    }

    setStepState("feedback");
    clearText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranscribing, stepState]);

  // Safety: Whisper timeout
  useEffect(() => {
    if (stepState !== "checking") return;
    const t = setTimeout(() => {
      if (currentStep) {
        const words = currentStep.phrase.replace(/\u200c/g, "").split(/\s+/).filter(Boolean);
        setWordResults(words.map((w) => ({ word: w, matched: false })));
      }
      setStepState("feedback");
      clearText();
    }, 10000);
    return () => clearTimeout(t);
  }, [stepState, clearText, currentStep]);

  const goNext = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (!lesson) return;
    if (stepIndex + 1 >= lesson.steps.length) {
      saveLessonProgress(lesson.id, lesson.steps.length, lesson.steps.length);
      recordActivity();
      addXP("sessionComplete");
      setCompleted(true);
    } else {
      setStepIndex(stepIndex + 1);
    }
  }, [lesson, stepIndex]);

  const handleStart = () => {
    unlockAudio();
    hasStarted.current = true;
    const step = lesson?.steps[0];
    if (!step) return;
    resetState();
    if (step.type === "tip") {
      setStepState("playing");
      playJaTTS(step.tipText || step.translation).then(() => playTTS(step.phrase)).then(() => {
        autoTimer.current = setTimeout(() => goNext(), 1500);
      });
    } else if (step.type === "listen") {
      setStepState("playing");
      playTTS(step.phrase).then(() => { autoTimer.current = setTimeout(() => goNext(), 1500); });
    } else if (step.type === "speak" || step.type === "speak-cloze" || step.type === "choose" || step.type === "dictation") {
      setStepState("playing");
      playTTS(step.phrase).then(() => setStepState("ready"));
    } else if (step.type === "reorder") {
      setStepState("ready");
      if (step.words) setReorderAvailable([...step.words]);
    }
  };

  const handleRecord = () => {
    unlockAudio();
    if (stepState === "ready" || stepState === "feedback") {
      clearText();
      setWordResults([]);
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
    if (correct) addXP("exerciseCorrect");
    else recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson", 0);
    autoTimer.current = setTimeout(() => goNext(), correct ? 1500 : 2500);
  };

  // Reorder
  const addReorderWord = (w: string, i: number) => {
    setReorderBuilt([...reorderBuilt, w]);
    const n = [...reorderAvailable]; n.splice(i, 1); setReorderAvailable(n);
  };
  const removeReorderWord = (i: number) => {
    const w = reorderBuilt[i];
    const n = [...reorderBuilt]; n.splice(i, 1); setReorderBuilt(n);
    setReorderAvailable([...reorderAvailable, w]);
  };
  const checkReorder = () => {
    if (!currentStep) return;
    const correct = normalizePersian(reorderBuilt.join(" ")) === normalizePersian(currentStep.phrase);
    setInteractiveResult(correct ? "correct" : "wrong");
    addXP("lessonStep");
    if (correct) addXP("exerciseCorrect");
    else recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson", 0);
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
    if (correct) addXP("exerciseCorrect");
    else recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson", 0);
    autoTimer.current = setTimeout(() => goNext(), 2000);
  };

  const handleAddToSRS = useCallback(() => {
    if (!lesson) return;
    const cards = getAllCards();
    for (const s of lesson.steps.filter((s) => s.type === "speak" || s.type === "speak-cloze")) {
      if (!cards[s.phrase]) cards[s.phrase] = createNewCard(s.phrase);
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
          {nextLesson && <Link href={`/guided-lesson?id=${nextLesson.id}`} className="block w-full py-3.5 rounded-2xl bg-purple-600 text-white font-bold text-center">次のレッスンへ</Link>}
          <Link href="/" className="block w-full py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-bold text-center">ホームへ</Link>
        </div>
      </div>
    );
  }

  // ─── Active Lesson ───
  const reactionEmoji = wordResults.length > 0
    ? (matchedCount >= wordResults.length * 0.8 ? "🎉" : matchedCount >= wordResults.length * 0.4 ? "👍" : "💪")
    : "";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href="/" className="text-gray-400 text-xl">×</Link>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-gray-400">{stepIndex + 1}/{totalSteps}</span>
      </div>

      <div className="flex-1 px-5 py-6 flex flex-col items-center justify-center">

        {/* TIP */}
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

        {/* LISTEN */}
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

        {/* SPEAK / SPEAK-CLOZE */}
        {(currentStep?.type === "speak" || currentStep?.type === "speak-cloze") && (
          <div className="animate-slide-in w-full max-w-sm text-center">
            <span className="px-4 py-1.5 bg-purple-100 text-purple-700 text-xs rounded-full font-bold mb-4 inline-block">声に出そう</span>

            {/* Feedback: word-by-word color display */}
            {stepState === "feedback" && wordResults.length > 0 ? (
              <div className="mb-4">
                <div className="text-3xl mb-3">{reactionEmoji}</div>
                <div className="flex flex-wrap gap-1.5 justify-center mb-3" dir="rtl">
                  {wordResults.map((wr, i) => (
                    <button key={i} onClick={() => playTTS(wr.word)}
                      className={`px-2.5 py-1.5 rounded-lg persian-text text-lg font-bold active:scale-95 transition-transform ${
                        wr.matched ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-500"
                      }`}>
                      {wr.word}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400">単語をタップするとお手本が聞けます</p>
                <p className="text-sm text-gray-500 mt-2">{currentStep.translation}</p>
              </div>
            ) : (
              // Normal display
              <div className="mb-4">
                {currentStep.type === "speak-cloze" && currentStep.clozeWord ? (
                  <p className="persian-text text-2xl font-bold text-gray-900 mb-2" dir="rtl">
                    {currentStep.phrase.split(currentStep.clozeWord)[0]}
                    <span className="bg-yellow-200 text-yellow-800 px-2 rounded-lg mx-1">____</span>
                    {currentStep.phrase.split(currentStep.clozeWord).slice(1).join(currentStep.clozeWord)}
                  </p>
                ) : (
                  <p className="persian-text text-2xl font-bold text-gray-900 mb-2" dir="rtl">{currentStep.phrase}</p>
                )}
                <p className="text-sm text-gray-500">{currentStep.translation}</p>
              </div>
            )}
          </div>
        )}

        {/* CHOOSE */}
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
                      className={`w-full p-3 rounded-xl border text-left transition-all active:scale-95 ${cls}`}>{choice}</button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* REORDER */}
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

        {/* DICTATION */}
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

        {/* Checking spinner */}
        {stepState === "checking" && (
          <div className="mt-4">
            <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400 mt-2">チェック中...</p>
          </div>
        )}
      </div>

      {/* ─── Bottom Actions ─── */}
      <div className="px-5 pb-8 space-y-3">

        {/* SPEAK: mic button */}
        {(currentStep?.type === "speak" || currentStep?.type === "speak-cloze") && (stepState === "ready" || stepState === "recording") && (
          <>
            <button onClick={handleRecord}
              className={`w-full py-5 rounded-2xl font-bold text-lg transition-all ${
                isRecording ? "bg-red-500 text-white mic-recording" : "bg-purple-600 text-white shadow-lg shadow-purple-200 active:scale-95"
              }`}>
              {isRecording ? "🎙️ 録音中...タップで停止" : "🎙️ タップして話す"}
            </button>
            <button onClick={() => playTTS(currentStep!.phrase)} disabled={isPlaying}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium disabled:opacity-30">
              お手本をもう一度聞く
            </button>
          </>
        )}

        {/* SPEAK: feedback → retry or next */}
        {(currentStep?.type === "speak" || currentStep?.type === "speak-cloze") && stepState === "feedback" && (
          <div className="flex gap-3">
            <button onClick={handleRecord}
              className="flex-1 py-4 rounded-2xl bg-white border-2 border-purple-200 text-purple-600 font-bold text-sm active:scale-95">
              もう一度
            </button>
            <button onClick={goNext}
              className="flex-1 py-4 rounded-2xl bg-purple-600 text-white font-bold text-sm active:scale-95">
              次へ
            </button>
          </div>
        )}

        {/* SPEAK: checking */}
        {(currentStep?.type === "speak" || currentStep?.type === "speak-cloze") && stepState === "checking" && (
          <div className="w-full py-5 rounded-2xl bg-gray-200 text-gray-500 font-bold text-lg text-center animate-pulse">
            チェック中...
          </div>
        )}

        {/* REORDER submit */}
        {currentStep?.type === "reorder" && reorderAvailable.length === 0 && interactiveResult === null && (
          <button onClick={checkReorder} className="w-full py-4 rounded-2xl bg-amber-500 text-white font-bold text-lg active:scale-95">回答を確認</button>
        )}

        {/* DICTATION submit */}
        {currentStep?.type === "dictation" && stepState !== "playing" && interactiveResult === null && (
          <button onClick={checkDictation} disabled={!dictationInput.trim()}
            className="w-full py-4 rounded-2xl bg-cyan-500 text-white font-bold text-lg active:scale-95 disabled:opacity-50">回答する</button>
        )}

        {/* TIP/LISTEN next */}
        {(currentStep?.type === "tip" || currentStep?.type === "listen") && (
          <button onClick={() => { if (autoTimer.current) clearTimeout(autoTimer.current); goNext(); }}
            className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-lg active:scale-95">次へ</button>
        )}

        {/* CHOOSE listen again */}
        {currentStep?.type === "choose" && stepState === "ready" && interactiveResult === null && (
          <button onClick={() => playTTS(currentStep.phrase)} disabled={isPlaying}
            className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium disabled:opacity-30">もう一度聞く</button>
        )}
      </div>
    </div>
  );
}
