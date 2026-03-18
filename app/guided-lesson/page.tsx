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
type StepState = "intro" | "playing" | "ready" | "recording" | "checking" | "success" | "retry";

// --- Client-side phrase matching (no API roundtrip) ---
function normalizePersian(text: string): string {
  return text
    .replace(/\u200c/g, "")
    .replace(/\u0643/g, "\u06A9")
    .replace(/\u064A/g, "\u06CC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[.،؟!؛:«»\-\s]+/g, " ")
    .trim()
    .toLowerCase();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

/** Word-level similarity: checks how many expected words appear in what was spoken */
function getSimilarity(target: string, spoken: string, mode?: string, clozeWord?: string): number {
  const na = normalizePersian(target);
  const nb = normalizePersian(spoken);
  if (na === nb) return 100;

  // Word-level matching (much more forgiving for non-native speakers)
  const expectedWords = na.split(" ").filter(Boolean);
  const spokenWords = nb.split(" ").filter(Boolean);
  if (expectedWords.length === 0) return 0;
  if (spokenWords.length === 0) return 0;

  let matchedWords = 0;
  for (const ew of expectedWords) {
    // Check if any spoken word is >= 50% similar to this expected word
    const bestWordMatch = Math.max(
      ...spokenWords.map((sw) => {
        if (ew === sw) return 1;
        const maxLen = Math.max(ew.length, sw.length);
        if (maxLen === 0) return 0;
        return (maxLen - levenshteinDistance(ew, sw)) / maxLen;
      }),
      0
    );
    if (bestWordMatch >= 0.5) matchedWords++;
  }

  let score = (matchedWords / expectedWords.length) * 100;

  // Cloze bonus: if the key word is in the spoken text, big boost
  if (mode === "cloze" && clozeWord && nb.includes(normalizePersian(clozeWord))) {
    score = Math.max(score, 80);
  }

  // Also try full-string Levenshtein as fallback (for short phrases)
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen > 0) {
    const charSimilarity = ((maxLen - levenshteinDistance(na, nb)) / maxLen) * 100;
    score = Math.max(score, charSimilarity);
  }

  return Math.round(score);
}

const PASS_THRESHOLD = 70; // 70%以上で合格（通じるレベル）

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
  const [lastHeard, setLastHeard] = useState(""); // What Whisper heard — for feedback

  const { isRecording, isTranscribing, transcribedText, startRecording, stopRecording, clearText } = useAudioRecorder();
  const { isPlaying, play: playTTS, unlock: unlockAudio } = useTTS();
  const autoFlowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStarted = useRef(false);

  // Japanese TTS — independent from Persian TTS to avoid shared state conflicts
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
    } catch {
      // Japanese TTS failed — continue silently
    }
  }, []);

  // Level-based display
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

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (autoFlowTimer.current) clearTimeout(autoFlowTimer.current);
    };
  }, []);

  // Auto-flow: when step changes, start the flow automatically
  useEffect(() => {
    if (!currentStep || !hasStarted.current) return;
    setShowTranslation(false);

    if (currentStep.type === "tip") {
      setStepState("intro");
      // First read Japanese explanation, then play Persian phrase
      speakJapanese(currentStep.tipText || currentStep.translation).then(() => {
        return playTTS(currentStep.phrase);
      }).then(() => {
        autoFlowTimer.current = setTimeout(() => {
          goNext();
        }, 2000);
      });
    } else if (currentStep.type === "listen") {
      setStepState("playing");
      playTTS(currentStep.phrase).then(() => {
        // After listen, auto-advance to next step after 1 second
        autoFlowTimer.current = setTimeout(() => {
          goNext();
        }, 1200);
      });
    } else if (currentStep.type === "speak" || currentStep.type === "speak-cloze") {
      setStepState("playing");
      // Play model first, then prompt to speak
      playTTS(currentStep.phrase).then(() => {
        autoFlowTimer.current = setTimeout(() => {
          setStepState("ready");
        }, 800);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, hasStarted.current]);

  // When recording stops → go to checking (wait for Whisper)
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

      if (score >= 80) {
        setPraiseText(currentStep.praiseText || "آفرین! 🎉");
      } else if (score >= 50) {
        setPraiseText("خوبه! 👍");
      } else {
        setPraiseText("👏");
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

  // Start the lesson (first tap activates audio context + begins flow)
  const handleStart = () => {
    unlockAudio();
    hasStarted.current = true;
    // Trigger the first step
    if (currentStep) {
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
      } else {
        setStepState("playing");
        playTTS(currentStep.phrase).then(() => {
          autoFlowTimer.current = setTimeout(() => setStepState("ready"), 800);
        });
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

  // Start screen (before audio context unlocked)
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
          <button
            onClick={handleAddToSRS}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold"
          >
            SRSに追加
          </button>
          {nextLesson && (
            <Link
              href={`/guided-lesson?id=${nextLesson.id}`}
              className="block w-full py-3.5 rounded-2xl bg-purple-600 text-white font-bold text-center"
            >
              次のレッスンへ
            </Link>
          )}
          <Link
            href="/"
            className="block w-full py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-bold text-center"
          >
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

    // Cloze: ローマ字は隠す、意味はヒントとして表示
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
      // A1/A2: ローマ字メイン、ペルシア語サブ
      return (
        <div className="text-center">
          <p className="text-2xl font-black text-gray-900 mb-2 tracking-wide">
            {currentStep.romanization}
          </p>
          <p className="persian-text text-base text-gray-400 mb-1" dir="rtl">
            {currentStep.phrase}
          </p>
        </div>
      );
    } else {
      // B1/B2: ペルシア語メイン
      return (
        <div className="text-center">
          <p className="persian-text text-2xl font-bold text-gray-900 mb-2" dir="rtl">
            {currentStep.phrase}
          </p>
          <p className="text-sm text-gray-400 mb-1">{currentStep.romanization}</p>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href="/" className="text-gray-400 text-xl">×</Link>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">{stepIndex + 1}/{totalSteps}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 px-5 py-6 flex flex-col items-center justify-center">
        {/* Step indicator */}
        <div className="mb-4">
          {currentStep?.type === "tip" && (
            <span className="px-4 py-1.5 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">
              ポイント
            </span>
          )}
          {currentStep?.type === "listen" && (
            <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold">
              聞いてみよう
            </span>
          )}
          {currentStep?.type === "speak" && (
            <span className="px-4 py-1.5 bg-purple-100 text-purple-700 text-xs rounded-full font-bold">
              声に出そう
            </span>
          )}
          {currentStep?.type === "speak-cloze" && (
            <span className="px-4 py-1.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-bold">
              穴埋めで声に出そう
            </span>
          )}
        </div>

        {/* Tip content */}
        {currentStep?.type === "tip" && (
          <div className="w-full max-w-sm animate-slide-in">
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
              <p className="text-gray-700 leading-relaxed text-center">
                {currentStep.tipText}
              </p>
            </div>
            {renderPhrase()}
          </div>
        )}

        {/* Listen content — 初出フレーズなので意味を表示 */}
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

        {/* Speak / speak-cloze content — 練習フェーズ */}
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

            {/* speak: タップで意味、cloze: renderPhrase内で既に表示 */}
            {currentStep.type === "speak" && (
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className="block mx-auto mt-2"
              >
                {showTranslation ? (
                  <span className="text-sm text-gray-500">{currentStep.translation}</span>
                ) : (
                  <span className="text-xs text-gray-300 underline">意味を見る</span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Success */}
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

            {/* Replay model */}
            <button
              onClick={handleReplay}
              disabled={isPlaying || stepState === "recording"}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium disabled:opacity-30"
            >
              {isPlaying ? "再生中..." : "お手本をもう一度聞く"}
            </button>

          </>
        )}

        {/* Tip step: auto-advances, but show skip button */}
        {currentStep?.type === "tip" && (
          <button
            onClick={() => { if (autoFlowTimer.current) clearTimeout(autoFlowTimer.current); goNext(); }}
            className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold text-lg active:scale-95 transition-transform"
          >
            次へ
          </button>
        )}

        {/* Listen step: show during playback */}
        {currentStep?.type === "listen" && (
          <button
            onClick={() => { if (autoFlowTimer.current) clearTimeout(autoFlowTimer.current); goNext(); }}
            className="w-full py-4 rounded-2xl bg-gray-200 text-gray-500 font-bold text-lg active:scale-95 transition-transform"
          >
            スキップ
          </button>
        )}

        {/* Back button */}
        {stepIndex > 0 && stepState !== "recording" && stepState !== "checking" && (
          <button
            onClick={goBack}
            className="w-full py-2 text-gray-400 text-sm font-medium"
          >
            ← 前のステップ
          </button>
        )}
      </div>
    </div>
  );
}
