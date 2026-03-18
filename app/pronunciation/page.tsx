"use client";

import { useState, useEffect, useCallback } from "react";
import { loadVocabulary, VocabularyItem } from "@/lib/data-loader";
import PersianText from "@/components/PersianText";
import AudioPlayer from "@/components/AudioPlayer";
import AudioRecorder from "@/components/AudioRecorder";
import { apiUrl } from "@/lib/api-config";

interface PronunciationResult {
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  words: {
    word: string;
    accuracyScore: number;
    errorType: string;
  }[];
}

export default function PronunciationPage() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [mode, setMode] = useState<"vocabulary" | "custom">("vocabulary");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [customText, setCustomText] = useState("");
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadVocabulary().then(setItems);
  }, []);

  const targetText =
    mode === "vocabulary" && items[currentIndex]
      ? items[currentIndex].ペルシア語
      : customText;

  const handleRecordingComplete = useCallback(
    async (audioBlob: Blob) => {
      if (!targetText.trim()) {
        setError("ターゲットテキストを入力してください");
        return;
      }

      setEvaluating(true);
      setError("");
      setResult(null);

      try {
        const tokenRes = await fetch(apiUrl("/api/pronunciation"));
        const { token, region } = await tokenRes.json();

        if (!token) {
          setError("Azure認証に失敗しました");
          setEvaluating(false);
          return;
        }

        const sdk = await import("microsoft-cognitiveservices-speech-sdk");

        const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
        speechConfig.speechRecognitionLanguage = "fa-IR";

        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
        const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
        pushStream.write(arrayBuffer);
        pushStream.close();

        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
          targetText,
          sdk.PronunciationAssessmentGradingSystem.HundredMark,
          sdk.PronunciationAssessmentGranularity.Word
        );
        pronunciationConfig.applyTo(recognizer);

        recognizer.recognizeOnceAsync(
          (speechResult) => {
            const pronResult = sdk.PronunciationAssessmentResult.fromResult(speechResult);
            const detailResult = pronResult.detailResult;

            setResult({
              accuracyScore: pronResult.accuracyScore,
              fluencyScore: pronResult.fluencyScore,
              completenessScore: pronResult.completenessScore,
              words:
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                detailResult?.Words?.map((w: any) => ({
                    word: w.Word as string,
                    accuracyScore: (w.PronunciationAssessment?.AccuracyScore as number) ?? 0,
                    errorType: (w.PronunciationAssessment?.ErrorType as string) ?? "None",
                  })
                ) ?? [],
            });
            setEvaluating(false);
            recognizer.close();
          },
          (err) => {
            setError(`認識エラー: ${err}`);
            setEvaluating(false);
            recognizer.close();
          }
        );
      } catch (e) {
        setError(`エラー: ${e instanceof Error ? e.message : String(e)}`);
        setEvaluating(false);
      }
    },
    [targetText]
  );

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const scoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">発音評価</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("vocabulary")}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            mode === "vocabulary" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          単語から選択
        </button>
        <button
          onClick={() => setMode("custom")}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            mode === "custom" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          テキスト入力
        </button>
      </div>

      {mode === "vocabulary" && items.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-4">
          <div className="text-center">
            <PersianText size="2xl" className="text-gray-900 mb-2">
              {items[currentIndex]?.ペルシア語}
            </PersianText>
            <p className="text-sm text-gray-500 mb-1">
              {items[currentIndex]?.日本語} / {items[currentIndex]?.英語}
            </p>
            <p className="text-sm text-emerald-600 mb-3">
              {items[currentIndex]?.ローマ字}
            </p>
            <div className="flex items-center justify-center gap-3">
              <AudioPlayer text={items[currentIndex]?.ペルシア語} />
              <span className="text-xs text-gray-400">お手本を聞く</span>
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <button
              onClick={() => {
                setCurrentIndex((i) => (i - 1 + items.length) % items.length);
                setResult(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              &larr; 前
            </button>
            <span className="text-xs text-gray-400">
              {currentIndex + 1} / {items.length}
            </span>
            <button
              onClick={() => {
                setCurrentIndex((i) => (i + 1) % items.length);
                setResult(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              次 &rarr;
            </button>
          </div>
        </div>
      )}

      {mode === "custom" && (
        <div className="mb-4">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="ペルシア語テキストを入力..."
            className="w-full p-3 rounded-lg border border-gray-200 bg-white persian-text text-lg"
            dir="rtl"
            rows={3}
          />
          {customText && (
            <div className="flex items-center gap-2 mt-2">
              <AudioPlayer text={customText} />
              <span className="text-xs text-gray-400">お手本を聞く</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center my-6">
        {evaluating ? (
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-8 h-8 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <AudioRecorder onRecordingComplete={handleRecordingComplete} />
        )}
        <p className="text-xs text-gray-400 mt-2">
          {evaluating ? "評価中..." : "タップして録音開始"}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slide-in">
          <h3 className="font-semibold text-gray-900 mb-4">評価結果</h3>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "正確さ", score: result.accuracyScore },
              { label: "流暢さ", score: result.fluencyScore },
              { label: "完全性", score: result.completenessScore },
            ].map(({ label, score }) => (
              <div key={label} className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18" cy="18" r="15.9"
                      fill="none" stroke="#e5e7eb" strokeWidth="3"
                    />
                    <circle
                      cx="18" cy="18" r="15.9"
                      fill="none"
                      stroke={score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="3"
                      strokeDasharray={`${score} ${100 - score}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${scoreColor(score)}`}>
                    {Math.round(score)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {result.words.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">単語別評価</p>
              <div className="flex flex-wrap gap-2" dir="rtl">
                {result.words.map((w, i) => (
                  <div
                    key={i}
                    className={`px-3 py-1.5 rounded-lg persian-text ${
                      w.accuracyScore >= 80
                        ? "bg-emerald-50 text-emerald-800"
                        : w.accuracyScore >= 60
                        ? "bg-yellow-50 text-yellow-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    <span className="text-base">{w.word}</span>
                    <span className="text-xs ml-1 opacity-70">{Math.round(w.accuracyScore)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${scoreBg(result.accuracyScore)}`}
              style={{ width: `${result.accuracyScore}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
