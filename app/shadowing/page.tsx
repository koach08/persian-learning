"use client";

import { useState, useEffect, useRef } from "react";
import { getCEFRProgress } from "@/lib/level-manager";
import type { CEFRLevel } from "@/lib/level-manager";
import PersianText from "@/components/PersianText";
import { apiUrl } from "@/lib/api-config";

interface ShadowPhrase {
  persian: string;
  romanization: string;
  japanese: string;
}

const PHRASES: Record<CEFRLevel, ShadowPhrase[]> = {
  A1: [
    { persian: "سلام، حال شما چطور است؟", romanization: "salâm, hâl-e shomâ chetor ast?", japanese: "こんにちは、お元気ですか？" },
    { persian: "من خوبم، ممنون", romanization: "man khubam, mamnun", japanese: "元気です、ありがとう" },
    { persian: "اسم من علی است", romanization: "esm-e man Ali ast", japanese: "私の名前はアリです" },
    { persian: "من دانشجو هستم", romanization: "man dâneshjoo hastam", japanese: "私は学生です" },
    { persian: "خیلی خوشحالم", romanization: "kheili khoshhâlam", japanese: "とても嬉しいです" },
    { persian: "لطفاً آهسته صحبت کنید", romanization: "lotfan âheste sohbat konid", japanese: "ゆっくり話してください" },
    { persian: "من ژاپنی هستم", romanization: "man zhâponi hastam", japanese: "私は日本人です" },
    { persian: "این چیست؟", romanization: "in chist?", japanese: "これは何ですか？" },
  ],
  A2: [
    { persian: "من هر روز ساعت هفت بیدار می‌شوم", romanization: "man har ruz sâ'at-e haft bidâr mi-shavam", japanese: "私は毎日7時に起きます" },
    { persian: "دیروز به بازار رفتم", romanization: "diruz be bâzâr raftam", japanese: "昨日バザールに行きました" },
    { persian: "آب و هوا امروز خیلی خوب است", romanization: "âb-o-havâ emruz kheili khub ast", japanese: "今日の天気はとても良いです" },
    { persian: "می‌توانم منو را ببینم؟", romanization: "mi-tavânam meno râ bebinam?", japanese: "メニューを見せてもらえますか？" },
    { persian: "من چای سبز می‌خواهم", romanization: "man châi-ye sabz mi-khâham", japanese: "緑茶をください" },
    { persian: "ایستگاه مترو کجاست؟", romanization: "istgâh-e metro kojâst?", japanese: "地下鉄の駅はどこですか？" },
  ],
  B1: [
    { persian: "من فکر می‌کنم که زبان فارسی خیلی زیباست", romanization: "man fekr mi-konam ke zabân-e fârsi kheili zibâst", japanese: "ペルシア語はとても美しい言語だと思います" },
    { persian: "اگر وقت داشته باشم، به اصفهان سفر می‌کنم", romanization: "agar vaqt dâshte bâsham, be esfahân safar mi-konam", japanese: "時間があればエスファハンに旅行します" },
    { persian: "ایران کشوری با تاریخ و فرهنگ غنی است", romanization: "irân keshvari bâ târikh-o farhang-e ghani ast", japanese: "イランは豊かな歴史と文化を持つ国です" },
    { persian: "من سه سال است که فارسی یاد می‌گیرم", romanization: "man se sâl ast ke fârsi yâd mi-giram", japanese: "私は3年間ペルシア語を学んでいます" },
  ],
  B2: [
    { persian: "به نظر من، یادگیری زبان نه تنها مهارت ارتباطی را تقویت می‌کند، بلکه دید فرهنگی ما را وسیع‌تر می‌کند", romanization: "be nazar-e man, yâdgiri-ye zabân na tanhâ mahârat-e ertebâti râ taqviyat mi-konad, balke did-e farhangi-ye mâ râ vasi'-tar mi-konad", japanese: "言語学習はコミュニケーション能力を高めるだけでなく、文化的視野を広げると思います" },
    { persian: "با وجود اینکه فارسی و عربی الفبای مشترکی دارند، ساختار دستوری آنها کاملاً متفاوت است", romanization: "bâ vojud-e inke fârsi-o arabi alefbâ-ye moshtaraki dârand, sâkhtâr-e dasturi-ye ânhâ kâmelan motefâvet ast", japanese: "ペルシア語とアラビア語は文字を共有していますが、文法構造は全く異なります" },
  ],
};

type Phase = "select" | "practice";

export default function ShadowingPage() {
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [phase, setPhase] = useState<Phase>("select");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showRoman, setShowRoman] = useState(true);
  const [showJapanese, setShowJapanese] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [pronScore, setPronScore] = useState<{ accuracy: number; fluency: number; completeness: number } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [sessionStats, setSessionStats] = useState({ practiced: 0, totalScore: 0 });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const l = getCEFRProgress().currentLevel;
    setLevel(l);
    setShowRoman(l === "A1" || l === "A2");
  }, []);

  const phrases = PHRASES[level];
  const current = phrases[currentIndex];

  const playModel = async () => {
    if (!current || isPlaying) return;
    setIsPlaying(true);
    try {
      const res = await fetch(apiUrl("/api/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: current.persian, speed: playbackSpeed }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = playbackSpeed;
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await evaluatePronunciation(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      // microphone access denied
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const evaluatePronunciation = async (audioBlob: Blob) => {
    try {
      // Get Azure token
      const tokenRes = await fetch(apiUrl("/api/pronunciation"));
      const { token, region } = await tokenRes.json();
      if (!token) {
        // Fallback: use Whisper for basic comparison
        await fallbackEvaluation(audioBlob);
        return;
      }

      const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "fa-IR";

      const pronConfig = new SpeechSDK.PronunciationAssessmentConfig(
        current.persian,
        SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
        SpeechSDK.PronunciationAssessmentGranularity.Word,
        true
      );

      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const pushStream = SpeechSDK.AudioInputStream.createPushStream();
      pushStream.write(arrayBuffer);
      pushStream.close();

      const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(pushStream);
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      pronConfig.applyTo(recognizer);

      recognizer.recognizeOnceAsync(
        (result) => {
          if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            const pronResult = SpeechSDK.PronunciationAssessmentResult.fromResult(result);
            setPronScore({
              accuracy: Math.round(pronResult.accuracyScore),
              fluency: Math.round(pronResult.fluencyScore),
              completeness: Math.round(pronResult.completenessScore),
            });
          }
          setAttempts((a) => a + 1);
          recognizer.close();
        },
        (err) => {
          console.error("Pronunciation assessment error:", err);
          recognizer.close();
        }
      );
    } catch {
      await fallbackEvaluation(audioBlob);
    }
  };

  const fallbackEvaluation = async (audioBlob: Blob) => {
    // Use Whisper to transcribe and do text comparison
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("language", "fa");
    try {
      const res = await fetch(apiUrl("/api/whisper"), { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) {
        const similarity = textSimilarity(current.persian, data.text);
        setPronScore({
          accuracy: Math.round(similarity * 100),
          fluency: Math.round(similarity * 90),
          completeness: Math.round(similarity * 95),
        });
      }
    } catch {
      // silent fail
    }
    setAttempts((a) => a + 1);
  };

  const textSimilarity = (a: string, b: string): number => {
    const wordsA = a.replace(/[^\u0600-\u06FF\s]/g, "").split(/\s+/);
    const wordsB = b.replace(/[^\u0600-\u06FF\s]/g, "").split(/\s+/);
    let matches = 0;
    for (const w of wordsA) {
      if (wordsB.includes(w)) matches++;
    }
    return wordsA.length > 0 ? matches / wordsA.length : 0;
  };

  const nextPhrase = () => {
    if (pronScore) {
      setSessionStats((s) => ({
        practiced: s.practiced + 1,
        totalScore: s.totalScore + pronScore.accuracy,
      }));
    }
    setCurrentIndex((i) => (i + 1) % phrases.length);
    setPronScore(null);
    setAttempts(0);
  };

  const scoreColor = (s: number) => (s >= 80 ? "text-emerald-600" : s >= 60 ? "text-yellow-600" : "text-red-600");

  // ── Select Phase ──
  if (phase === "select") {
    return (
      <div className="px-4 pt-6 pb-8">
        <h1 className="text-xl font-bold text-gray-900 mb-2">シャドーイング</h1>
        <p className="text-sm text-gray-500 mb-4">モデル音声を聞いて、真似して発声しよう。発音の精度を評価します。</p>

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
                level === l ? "bg-orange-500 text-white shadow-md" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Phrase preview */}
        <p className="text-xs text-gray-400 font-medium mb-2">── 練習フレーズ ({PHRASES[level].length}個) ──</p>
        <div className="space-y-2 mb-6">
          {PHRASES[level].map((p, i) => (
            <div key={i} className="p-3 bg-white rounded-xl border border-gray-100">
              <PersianText size="md" className="text-gray-900">
                {p.persian}
              </PersianText>
              <p className="text-xs text-gray-500 mt-1">{p.japanese}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            setPhase("practice");
            setCurrentIndex(0);
            setPronScore(null);
            setAttempts(0);
            setSessionStats({ practiced: 0, totalScore: 0 });
          }}
          className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors"
        >
          練習を始める
        </button>
      </div>
    );
  }

  // ── Practice Phase ──
  return (
    <div className="px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setPhase("select")} className="text-sm text-orange-500">
          ← 戻る
        </button>
        <span className="text-sm text-gray-500">
          {currentIndex + 1}/{phrases.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / phrases.length) * 100}%` }}
        />
      </div>

      {/* Session stats */}
      {sessionStats.practiced > 0 && (
        <div className="text-xs text-gray-400 text-center mb-4">
          練習済み: {sessionStats.practiced} | 平均スコア: {Math.round(sessionStats.totalScore / sessionStats.practiced)}%
        </div>
      )}

      {/* Current phrase */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
        <PersianText size="xl" className="text-gray-900 block text-center mb-3 leading-loose">
          {current.persian}
        </PersianText>
        {showRoman && (
          <p className="text-sm text-gray-500 text-center mb-2">{current.romanization}</p>
        )}
        {showJapanese && (
          <p className="text-sm text-gray-600 text-center">{current.japanese}</p>
        )}

        {/* Toggle buttons */}
        <div className="flex gap-2 justify-center mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowRoman(!showRoman)}
            className={`text-xs px-3 py-1 rounded-full ${showRoman ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}
          >
            ローマ字
          </button>
          <button
            onClick={() => setShowJapanese(!showJapanese)}
            className={`text-xs px-3 py-1 rounded-full ${showJapanese ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}
          >
            日本語
          </button>
        </div>
      </div>

      {/* Step 1: Listen */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 font-medium mb-2">Step 1: お手本を聞く</p>
        <div className="flex items-center gap-2">
          <button
            onClick={playModel}
            disabled={isPlaying}
            className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
              isPlaying ? "bg-orange-200 text-orange-700" : "bg-orange-500 text-white hover:bg-orange-600"
            }`}
          >
            {isPlaying ? "再生中..." : "お手本を再生"}
          </button>
          {/* Speed control */}
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="py-3 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1.0}>1.0x</option>
          </select>
        </div>
      </div>

      {/* Step 2: Record */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 font-medium mb-2">Step 2: 真似して発声</p>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : "bg-white text-gray-700 border-2 border-dashed border-gray-300 hover:border-orange-300 hover:bg-orange-50"
          }`}
        >
          {isRecording ? "録音停止" : "録音開始"}
        </button>
        {attempts > 0 && (
          <p className="text-xs text-gray-400 text-center mt-1">試行回数: {attempts}</p>
        )}
      </div>

      {/* Step 3: Results */}
      {pronScore && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4 animate-slide-in">
          <p className="text-xs text-gray-400 font-medium mb-3">Step 3: 評価結果</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className={`text-2xl font-bold ${scoreColor(pronScore.accuracy)}`}>{pronScore.accuracy}</p>
              <p className="text-xs text-gray-500">正確さ</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${scoreColor(pronScore.fluency)}`}>{pronScore.fluency}</p>
              <p className="text-xs text-gray-500">流暢さ</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${scoreColor(pronScore.completeness)}`}>{pronScore.completeness}</p>
              <p className="text-xs text-gray-500">完全性</p>
            </div>
          </div>

          {pronScore.accuracy < 70 && (
            <p className="text-sm text-orange-600 text-center mt-3">
              もう一度お手本を聞いてから挑戦してみましょう!
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setPronScore(null);
            setAttempts(0);
          }}
          className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-colors"
        >
          もう一度
        </button>
        <button
          onClick={nextPhrase}
          className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors"
        >
          次のフレーズ
        </button>
      </div>
    </div>
  );
}
