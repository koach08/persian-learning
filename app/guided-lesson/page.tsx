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
import { apiUrl } from "@/lib/api-config";
import { recordActivity } from "@/lib/streak";
import { createNewCard, getAllCards, saveAllCards } from "@/lib/srs";
import { addXP } from "@/lib/xp";
import { recordMistake } from "@/lib/mistake-tracker";
import { normalizePersian, levenshteinDistance, getSimilarity } from "@/lib/persian-utils";

type StepState = "intro" | "playing" | "ready" | "recording" | "checking" | "success" | "retry";

const PASS_THRESHOLD = 70;

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

  const [currentLevel, setCurrentLevel] = useState<CEFRLevel>("A1");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepState, setStepState] = useState<StepState>("intro");
  const [completed, setCompleted] = useState(false);
  const [praiseText, setPraiseText] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastHeard, setLastHeard] = useState("");

  // New step type states
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [reorderBuilt, setReorderBuilt] = useState<string[]>([]);
  const [reorderAvailable, setReorderAvailable] = useState<string[]>([]);
  const [dictationInput, setDictationInput] = useState("");
  const [interactiveResult, setInteractiveResult] = useState<"correct" | "wrong" | null>(null);

  const { isRecording, isTranscribing, transcribedText, startRecording, stopRecording, clearText } = useAudioRecorder();
  const { isPlaying, play: playTTS, unlock: unlockAudio } = useTTS();
  const autoFlowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStarted = useRef(false);

  const speakJapanese = useCallback(async (text: string): Promise<void> => {
    if (!text) return;
    try {
      const res = await fetch(apiUrl("/api/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: "ja", style: "natural" }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());
      });
    } catch { /* silent */ }
  }, []);

  const isBeginnerLevel = currentLevel === "A1" || currentLevel === "A2";

  useEffect(() => {
    const level = getCEFRProgress().currentLevel;
    setCurrentLevel(level);
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
    return () => {
      if (autoFlowTimer.current) clearTimeout(autoFlowTimer.current);
    };
  }, []);

  // Reset interactive states when step changes
  const resetInteractiveState = useCallback(() => {
    setChosenIndex(null);
    setReorderBuilt([]);
    setReorderAvailable([]);
    setDictationInput("");
    setInteractiveResult(null);
  }, []);

  // Auto-flow: when step changes, start the flow automatically
  useEffect(() => {
    if (!currentStep || !hasStarted.current) return;
    setShowTranslation(false);
    resetInteractiveState();

    if (currentStep.type === "tip") {
      setStepState("intro");
      speakJapanese(currentStep.tipText || currentStep.translation).then(() => {
        return playTTS(currentStep.phrase);
      }).then(() => {
        autoFlowTimer.current = setTimeout(() => goNext(), 2000);
      });
    } else if (currentStep.type === "listen") {
      setStepState("playing");
      playTTS(currentStep.phrase).then(() => {
        autoFlowTimer.current = setTimeout(() => goNext(), 1200);
      });
    } else if (currentStep.type === "speak" || currentStep.type === "speak-cloze") {
      setStepState("playing");
      playTTS(currentStep.phrase).then(() => {
        autoFlowTimer.current = setTimeout(() => setStepState("ready"), 800);
      });
    } else if (currentStep.type === "choose") {
      // Play the Persian phrase, then show choices
      setStepState("playing");
      playTTS(currentStep.phrase).then(() => {
        setStepState("ready");
      });
    } else if (currentStep.type === "reorder") {
      // Set up reorder words
      setStepState("ready");
      if (currentStep.words) {
        setReorderAvailable([...currentStep.words]);
      }
    } else if (currentStep.type === "dictation") {
      // Play audio, user types
      setStepState("playing");
      playTTS(currentStep.phrase).then(() => {
        setStepState("ready");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, hasStarted.current]);

  // When recording stops → go to checking
  useEffect(() => {
    if (stepState !== "recording" || isRecording) return;
    setStepState("checking");
  }, [isRecording, stepState]);

  // When Whisper finishes → show feedback → always advance
  useEffect(() => {
    if (stepState !== "checking") return;
    if (isTranscribing) return;

    const heard = transcribedText || "";
    setLastHeard(heard);

    if (heard && currentStep) {
      const score = getSimilarity(
        currentStep.phrase,
        heard,
        currentStep.type === "speak-cloze" ? "cloze" : "full",
        currentStep.clozeWord
      );

      addXP("lessonStep");

      if (score >= 80) {
        setPraiseText(currentStep.praiseText || "آفرین! 🎉");
      } else if (score >= 50) {
        setPraiseText("خوبه! 👍");
      } else {
        setPraiseText("👏");
      }

      // Track mistakes for low scores
      if (score < PASS_THRESHOLD) {
        recordMistake(
          currentStep.phrase,
          currentStep.romanization,
          currentStep.translation,
          "guided-lesson",
          score
        );
      }
    } else {
      setPraiseText("👏");
    }

    setStepState("success");
    autoFlowTimer.current = setTimeout(() => goNext(), 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranscribing, stepState]);

  // Safety: if Whisper takes too long (6s), advance anyway
  useEffect(() => {
    if (stepState !== "checking") return;
    const timeout = setTimeout(() => {
      setPraiseText("👏");
      setStepState("success");
      autoFlowTimer.current = setTimeout(() => goNext(), 1000);
    }, 6000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepState]);

  const goNext = useCallback(() => {
    if (autoFlowTimer.current) clearTimeout(autoFlowTimer.current);
    if (!lesson) return;
    const nextIdx = stepIndex + 1;
    if (nextIdx >= lesson.steps.length) {
      saveLessonProgress(lesson.id, lesson.steps.length, lesson.steps.length);
      recordActivity();
      addXP("sessionComplete");
      setCompleted(true);
    } else {
      setStepIndex(nextIdx);
      setPraiseText("");
      setRetryCount(0);
      clearText();
    }
  }, [lesson, stepIndex, clearText]);

  const goBack = useCallback(() => {
    if (autoFlowTimer.current) clearTimeout(autoFlowTimer.current);
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      setPraiseText("");
      clearText();
    }
  }, [stepIndex, clearText]);

  const handleStart = () => {
    unlockAudio();
    hasStarted.current = true;
    if (currentStep) {
      resetInteractiveState();
      if (currentStep.type === "tip") {
        setStepState("intro");
        speakJapanese(currentStep.tipText || currentStep.translation).then(() => {
          return playTTS(currentStep.phrase);
        }).then(() => {
          autoFlowTimer.current = setTimeout(() => goNext(), 2000);
        });
      } else if (currentStep.type === "listen") {
        setStepState("playing");
        playTTS(currentStep.phrase).then(() => {
          autoFlowTimer.current = setTimeout(() => goNext(), 1200);
        });
      } else if (currentStep.type === "speak" || currentStep.type === "speak-cloze") {
        setStepState("playing");
        playTTS(currentStep.phrase).then(() => {
          autoFlowTimer.current = setTimeout(() => setStepState("ready"), 800);
        });
      } else if (currentStep.type === "choose") {
        setStepState("playing");
        playTTS(currentStep.phrase).then(() => setStepState("ready"));
      } else if (currentStep.type === "reorder") {
        setStepState("ready");
        if (currentStep.words) setReorderAvailable([...currentStep.words]);
      } else if (currentStep.type === "dictation") {
        setStepState("playing");
        playTTS(currentStep.phrase).then(() => setStepState("ready"));
      }
    }
  };

  const handleRecord = () => {
    unlockAudio();
    if (stepState === "ready" || stepState === "retry") {
      startRecording();
      setStepState("recording");
    } else if (stepState === "recording") {
      stopRecording();
    }
  };

  const handleReplay = () => {
    if (currentStep && !isPlaying) {
      playTTS(currentStep.phrase);
    }
  };

  // --- Choose handler ---
  const handleChoose = (index: number) => {
    if (!currentStep || interactiveResult !== null) return;
    setChosenIndex(index);
    const isCorrect = index === currentStep.correctChoiceIndex;
    setInteractiveResult(isCorrect ? "correct" : "wrong");
    addXP("lessonStep");

    if (isCorrect) {
      setPraiseText(currentStep.praiseText || "آفرین! 🎉");
      addXP("exerciseCorrect");
    } else {
      setPraiseText("");
      recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson", 0);
    }

    autoFlowTimer.current = setTimeout(() => goNext(), 2000);
  };

  // --- Reorder handlers ---
  const addReorderWord = (word: string, index: number) => {
    setReorderBuilt([...reorderBuilt, word]);
    const next = [...reorderAvailable];
    next.splice(index, 1);
    setReorderAvailable(next);
  };

  const removeReorderWord = (index: number) => {
    const word = reorderBuilt[index];
    const next = [...reorderBuilt];
    next.splice(index, 1);
    setReorderBuilt(next);
    setReorderAvailable([...reorderAvailable, word]);
  };

  const checkReorder = () => {
    if (!currentStep) return;
    const builtSentence = reorderBuilt.join(" ");
    const expected = currentStep.phrase.replace(/\u200c/g, "");
    const isCorrect = normalizePersian(builtSentence) === normalizePersian(expected);
    setInteractiveResult(isCorrect ? "correct" : "wrong");
    addXP("lessonStep");

    if (isCorrect) {
      setPraiseText(currentStep.praiseText || "آفرین! 🎉");
      addXP("exerciseCorrect");
    } else {
      setPraiseText("");
      recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson", 0);
    }

    autoFlowTimer.current = setTimeout(() => goNext(), 2500);
  };

  // --- Dictation handler ---
  const checkDictation = () => {
    if (!currentStep) return;
    const normalized = normalizePersian(dictationInput);
    const expected = normalizePersian(currentStep.phrase);
    const maxLen = Math.max(normalized.length, expected.length);
    const distance = levenshteinDistance(normalized, expected);
    const similarity = maxLen > 0 ? ((maxLen - distance) / maxLen) * 100 : 0;
    const isCorrect = similarity >= 80;

    setInteractiveResult(isCorrect ? "correct" : "wrong");
    addXP("lessonStep");

    if (isCorrect) {
      setPraiseText(currentStep.praiseText || "آفرین! 🎉");
      addXP("exerciseCorrect");
    } else {
      setPraiseText("");
      recordMistake(currentStep.phrase, currentStep.romanization, currentStep.translation, "guided-lesson", Math.round(similarity));
    }

    autoFlowTimer.current = setTimeout(() => goNext(), 2500);
  };

  const handleAddToSRS = useCallback(() => {
    if (!lesson) return;
    const cards = getAllCards();
    const speakSteps = lesson.steps.filter((s) => s.type === "speak" || s.type === "speak-cloze");
    for (const step of speakSteps) {
      if (!cards[step.phrase]) {
        cards[step.phrase] = createNewCard(step.phrase);
      }
    }
    saveAllCards(cards);
    alert("フレーズをSRSに追加しました！");
  }, [lesson]);

  // --- Render ---

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
          <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-4xl mb-6">
            👩‍🏫
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">{lesson.title}</h1>
          {currentStep?.type === "tip" && (
            <p className="text-gray-600 text-center text-sm leading-relaxed mb-6 max-w-xs">
              {currentStep.tipText}
            </p>
          )}
          <p className="text-gray-400 text-sm mb-8">{totalSteps}ステップ</p>
          <button
            onClick={handleStart}
            className="w-full max-w-xs py-4 rounded-2xl bg-purple-600 text-white font-bold text-lg shadow-xl shadow-purple-200 active:scale-95 transition-transform"
          >
            レッスンを始める
          </button>
        </div>
        <div className="px-4 pb-6">
          <Link href="/" className="block text-center text-gray-400 text-sm">ホームへ戻る</Link>
        </div>
      </div>
    );
  }

  // Completion screen
  if (completed) {
    const speakSteps = lesson.steps.filter((s) => s.type === "speak" || s.type === "speak-cloze");
    const nextLesson = (() => {
      const levelLessons = getLessonsByLevel(lesson.level);
      const idx = levelLessons.findIndex((l) => l.id === lesson.id);
      return idx >= 0 && idx < levelLessons.length - 1 ? levelLessons[idx + 1] : null;
    })();

    return (
      <div className="px-5 pt-8 pb-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">レッスン完了！</h1>
          <p className="text-gray-500">{speakSteps.length}フレーズ練習しました</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="space-y-3">
            {speakSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 pb-2 border-b border-gray-50 last:border-0">
                <button
                  onClick={() => { unlockAudio(); playTTS(step.phrase); }}
                  className="shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
                <div className="flex-1 min-w-0">
                  {isBeginnerLevel ? (
                    <>
                      <p className="text-sm font-bold text-gray-900">{step.romanization}</p>
                      <p className="persian-text text-xs text-gray-400" dir="rtl">{step.phrase}</p>
                    </>
                  ) : (
                    <>
                      <p className="persian-text text-sm font-bold text-gray-900" dir="rtl">{step.phrase}</p>
                      <p className="text-xs text-gray-400">{step.romanization}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={handleAddToSRS} className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold">
            SRSに追加
          </button>
          {nextLesson && (
            <Link href={`/guided-lesson?id=${nextLesson.id}`} className="block w-full py-3.5 rounded-2xl bg-purple-600 text-white font-bold text-center">
              次のレッスンへ
            </Link>
          )}
          <Link href="/" className="block w-full py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-bold text-center">
            ホームへ
          </Link>
        </div>
      </div>
    );
  }

  // --- Active Lesson ---

  const renderPhrase = () => {
    if (!currentStep) return null;

    const clozeDisplay = currentStep.type === "speak-cloze" && currentStep.clozeWord;

    if (clozeDisplay) {
      const parts = currentStep.phrase.split(currentStep.clozeWord!);
      return (
        <div className="text-center">
          <p className="persian-text text-2xl font-bold text-gray-900 mb-2" dir="rtl">
            {parts[0]}<span className="bg-yellow-200 text-yellow-800 px-2 rounded-lg mx-1">____</span>{parts.slice(1).join(currentStep.clozeWord!)}
          </p>
          <p className="text-sm text-gray-500 mt-2">{currentStep.translation}</p>
        </div>
      );
    }

    if (isBeginnerLevel) {
      return (
        <div className="text-center">
          <p className="text-2xl font-black text-gray-900 mb-2 tracking-wide">{currentStep.romanization}</p>
          <p className="persian-text text-base text-gray-400 mb-1" dir="rtl">{currentStep.phrase}</p>
        </div>
      );
    } else {
      return (
        <div className="text-center">
          <p className="persian-text text-2xl font-bold text-gray-900 mb-2" dir="rtl">{currentStep.phrase}</p>
          <p className="text-sm text-gray-400 mb-1">{currentStep.romanization}</p>
        </div>
      );
    }
  };

  const stepBadge = () => {
    if (!currentStep) return null;
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      tip: { bg: "bg-blue-100", text: "text-blue-700", label: "ポイント" },
      listen: { bg: "bg-emerald-100", text: "text-emerald-700", label: "聞いてみよう" },
      speak: { bg: "bg-purple-100", text: "text-purple-700", label: "声に出そう" },
      "speak-cloze": { bg: "bg-yellow-100", text: "text-yellow-700", label: "穴埋めで声に出そう" },
      choose: { bg: "bg-pink-100", text: "text-pink-700", label: "意味を選ぼう" },
      reorder: { bg: "bg-amber-100", text: "text-amber-700", label: "並べ替えよう" },
      dictation: { bg: "bg-cyan-100", text: "text-cyan-700", label: "書き取り" },
    };
    const b = badges[currentStep.type];
    if (!b) return null;
    return <span className={`px-4 py-1.5 ${b.bg} ${b.text} text-xs rounded-full font-bold`}>{b.label}</span>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href="/" className="text-gray-400 text-xl">×</Link>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-gray-400">{stepIndex + 1}/{totalSteps}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 px-5 py-6 flex flex-col items-center justify-center">
        <div className="mb-4">{stepBadge()}</div>

        {/* Tip content */}
        {currentStep?.type === "tip" && (
          <div className="w-full max-w-sm animate-slide-in">
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
              <p className="text-gray-700 leading-relaxed text-center">{currentStep.tipText}</p>
            </div>
            {renderPhrase()}
          </div>
        )}

        {/* Listen content */}
        {currentStep?.type === "listen" && (
          <div className="animate-slide-in">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-all ${
              stepState === "playing" ? "bg-emerald-500 animate-pulse" : "bg-emerald-100"
            }`}>
              <svg className={`w-8 h-8 ${stepState === "playing" ? "text-white" : "text-emerald-600"}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            </div>
            {renderPhrase()}
            <p className="text-sm text-gray-500 text-center mt-2">{currentStep.translation}</p>
          </div>
        )}

        {/* Speak / speak-cloze content */}
        {(currentStep?.type === "speak" || currentStep?.type === "speak-cloze") && (
          <div className="animate-slide-in w-full max-w-sm">
            {stepState === "playing" && (
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </div>
            )}
            {renderPhrase()}
            {currentStep.type === "speak" && (
              <button onClick={() => setShowTranslation(!showTranslation)} className="block mx-auto mt-2">
                {showTranslation ? (
                  <span className="text-sm text-gray-500">{currentStep.translation}</span>
                ) : (
                  <span className="text-xs text-gray-300 underline">意味を見る</span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Choose content — 4択 */}
        {currentStep?.type === "choose" && (
          <div className="animate-slide-in w-full max-w-sm">
            {stepState === "playing" && (
              <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-6 h-6 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </div>
            )}

            {stepState !== "playing" && (
              <>
                {isBeginnerLevel ? (
                  <p className="text-xl font-bold text-gray-900 text-center mb-2">{currentStep.romanization}</p>
                ) : (
                  <p className="persian-text text-2xl font-bold text-gray-900 text-center mb-2" dir="rtl">{currentStep.phrase}</p>
                )}
                <button onClick={handleReplay} disabled={isPlaying} className="text-xs text-emerald-500 mx-auto block mb-4">
                  もう一度聞く
                </button>

                <div className="space-y-2">
                  {currentStep.choices?.map((choice, i) => {
                    let cls = "bg-white border-gray-200 text-gray-700";
                    if (interactiveResult !== null) {
                      if (i === currentStep.correctChoiceIndex) cls = "bg-emerald-50 border-emerald-300 text-emerald-800";
                      else if (i === chosenIndex && i !== currentStep.correctChoiceIndex) cls = "bg-red-50 border-red-300 text-red-800";
                    } else if (i === chosenIndex) {
                      cls = "bg-pink-50 border-pink-300 text-pink-700";
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleChoose(i)}
                        disabled={interactiveResult !== null}
                        className={`w-full p-3 rounded-xl border text-left transition-all ${cls}`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Reorder content */}
        {currentStep?.type === "reorder" && (
          <div className="animate-slide-in w-full max-w-sm">
            <p className="text-sm text-gray-600 text-center mb-4">{currentStep.translation}</p>

            {/* Built sentence */}
            <div className="min-h-[52px] p-3 bg-amber-50 rounded-xl border-2 border-dashed border-amber-200 mb-4 flex flex-wrap gap-2" dir="rtl">
              {reorderBuilt.length === 0 && <span className="text-amber-300 text-sm">ここに単語が並びます</span>}
              {reorderBuilt.map((word, i) => (
                <button key={`b-${i}`} onClick={() => removeReorderWord(i)}
                  className="px-3 py-1.5 bg-amber-200 text-amber-900 rounded-lg persian-text text-lg active:scale-95 transition-transform">
                  {word}
                </button>
              ))}
            </div>

            {/* Available words */}
            <div className="flex flex-wrap gap-2 mb-4 justify-center" dir="rtl">
              {reorderAvailable.map((word, i) => (
                <button key={`a-${i}`} onClick={() => addReorderWord(word, i)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg persian-text text-lg active:scale-95 transition-transform shadow-sm">
                  {word}
                </button>
              ))}
            </div>

            {interactiveResult && (
              <div className={`rounded-xl p-3 mb-3 text-center text-sm font-semibold ${
                interactiveResult === "correct" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}>
                {interactiveResult === "correct" ? "正解!" : "不正解"}
                {interactiveResult === "wrong" && (
                  <p className="persian-text text-base text-gray-800 mt-1 font-normal" dir="rtl">{currentStep.phrase}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dictation content */}
        {currentStep?.type === "dictation" && (
          <div className="animate-slide-in w-full max-w-sm">
            {stepState === "playing" && (
              <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-6 h-6 text-cyan-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </div>
            )}

            {stepState !== "playing" && (
              <>
                <p className="text-sm text-gray-500 text-center mb-2">{currentStep.translation}</p>
                <button onClick={handleReplay} disabled={isPlaying} className="text-xs text-cyan-500 mx-auto block mb-4">
                  もう一度聞く
                </button>

                <input
                  type="text"
                  value={dictationInput}
                  onChange={(e) => setDictationInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !interactiveResult && checkDictation()}
                  placeholder="ペルシア語で入力..."
                  className="w-full p-3 rounded-lg border border-gray-200 bg-white text-lg persian-text mb-3"
                  dir="rtl"
                  disabled={interactiveResult !== null}
                />

                {interactiveResult && (
                  <div className={`rounded-xl p-3 mb-3 text-sm ${
                    interactiveResult === "correct" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}>
                    <p className="font-semibold">{interactiveResult === "correct" ? "正解!" : "不正解"}</p>
                    <p className="persian-text text-base text-gray-800 mt-1" dir="rtl">{currentStep.phrase}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{currentStep.romanization}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Success feedback */}
        {stepState === "success" && praiseText && (
          <div className="mt-2 animate-bounce">
            <span className="persian-text text-3xl text-emerald-500 font-black">{praiseText}</span>
          </div>
        )}
      </div>

      {/* Bottom action area */}
      <div className="px-5 pb-8 space-y-3">
        {/* Speak step: Record button */}
        {(currentStep?.type === "speak" || currentStep?.type === "speak-cloze") && stepState !== "playing" && stepState !== "success" && (
          <>
            <button
              onClick={handleRecord}
              disabled={stepState === "checking"}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                stepState === "recording"
                  ? "bg-red-500 text-white animate-pulse"
                  : stepState === "checking"
                  ? "bg-gray-300 text-gray-500"
                  : "bg-purple-600 text-white shadow-lg shadow-purple-200 active:scale-95"
              }`}
            >
              {stepState === "recording" ? "タップで停止" :
               stepState === "checking" ? "チェック中..." :
               "タップして話す"}
            </button>
            <button onClick={handleReplay} disabled={isPlaying || stepState === "recording"}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium disabled:opacity-30">
              {isPlaying ? "再生中..." : "お手本をもう一度聞く"}
            </button>
          </>
        )}

        {/* Reorder: submit button */}
        {currentStep?.type === "reorder" && reorderAvailable.length === 0 && interactiveResult === null && (
          <button onClick={checkReorder}
            className="w-full py-4 rounded-2xl bg-amber-500 text-white font-bold text-lg active:scale-95 transition-transform">
            回答を確認
          </button>
        )}

        {/* Dictation: submit button */}
        {currentStep?.type === "dictation" && stepState !== "playing" && interactiveResult === null && (
          <button onClick={checkDictation} disabled={!dictationInput.trim()}
            className="w-full py-4 rounded-2xl bg-cyan-500 text-white font-bold text-lg active:scale-95 transition-transform disabled:opacity-50">
            回答する
          </button>
        )}

        {/* Tip step: next button */}
        {currentStep?.type === "tip" && (
          <button
            onClick={() => { if (autoFlowTimer.current) clearTimeout(autoFlowTimer.current); goNext(); }}
            className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold text-lg active:scale-95 transition-transform"
          >
            次へ
          </button>
        )}

        {/* UNIVERSAL skip/next — always available so user never gets stuck */}
        {stepState !== "recording" && stepState !== "checking" && (
          <button
            onClick={() => { if (autoFlowTimer.current) clearTimeout(autoFlowTimer.current); goNext(); }}
            className="w-full py-3 rounded-2xl bg-gray-100 text-gray-500 font-bold text-sm active:scale-95 transition-transform"
          >
            {currentStep?.type === "listen" || currentStep?.type === "tip" ? "スキップ" : "次へ進む →"}
          </button>
        )}

        {/* Back button */}
        {stepIndex > 0 && stepState !== "recording" && stepState !== "checking" && (
          <button onClick={goBack} className="w-full py-2 text-gray-400 text-sm font-medium">
            ← 前のステップ
          </button>
        )}
      </div>
    </div>
  );
}
