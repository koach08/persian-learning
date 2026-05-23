import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSimilarity, normalizePersian } from "@/lib/persian-utils";

const PRONUNCIATION_MODEL = process.env.OPENAI_PRONUNCIATION_MODEL || "gpt-4o-audio-preview";
const TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1";

export const runtime = "nodejs";

type WordScore = {
  word: string;
  accuracyScore: number;
};

type AssessmentResult = {
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  words: WordScore[];
  recognizedText: string;
  feedback: string;
};

function clampScore(score: unknown, fallback = 0): number {
  const n = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function getReferenceWords(referenceText: string): string[] {
  return referenceText
    .replace(/[.،؟!؛:«»\-\u200c]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function getWavStats(audioBuffer: ArrayBuffer): { rms: number; durationMs: number } | null {
  if (audioBuffer.byteLength <= 44) return null;

  const view = new DataView(audioBuffer);
  const channels = view.getUint16(22, true) || 1;
  const sampleRate = view.getUint32(24, true) || 16000;
  const bitsPerSample = view.getUint16(34, true) || 16;
  if (bitsPerSample !== 16) return null;

  const dataOffset = 44;
  const bytesPerSample = bitsPerSample / 8;
  const sampleCount = Math.floor((audioBuffer.byteLength - dataOffset) / bytesPerSample);
  if (sampleCount <= 0) return null;

  let sumSq = 0;
  for (let offset = dataOffset; offset + 1 < audioBuffer.byteLength; offset += bytesPerSample) {
    const sample = view.getInt16(offset, true) / 32768;
    sumSq += sample * sample;
  }

  return {
    rms: Math.sqrt(sumSq / sampleCount),
    durationMs: (sampleCount / Math.max(1, sampleRate * channels)) * 1000,
  };
}

function scoreFromTranscription(referenceText: string, recognizedText: string): AssessmentResult {
  const refWords = getReferenceWords(referenceText);
  const normalizedRecognizedWords = normalizePersian(recognizedText).split(" ").filter(Boolean);
  const accuracyScore = clampScore(getSimilarity(referenceText, recognizedText));

  const words = refWords.map((word) => {
    const best = Math.max(
      ...normalizedRecognizedWords.map((spoken) => getSimilarity(word, spoken)),
      recognizedText ? 10 : 0
    );
    return { word, accuracyScore: clampScore(best) };
  });

  const matchedWords = words.filter((w) => w.accuracyScore >= 55).length;
  const completenessScore = refWords.length > 0
    ? clampScore((matchedWords / refWords.length) * 100)
    : accuracyScore;
  const fluencyScore = recognizedText
    ? clampScore((accuracyScore * 0.7) + (completenessScore * 0.3))
    : 0;

  const feedback = recognizedText
    ? accuracyScore >= 75
      ? "よく発音できています。語尾と母音の長さを意識すると、さらに自然に聞こえます。"
      : accuracyScore >= 45
        ? "一部は認識できています。お手本を聞きながら、母音の長さと子音の出だしをもう一度練習しましょう。"
        : "発音の一部だけ認識できました。まずは短い単語に分けて、ゆっくりはっきり発声してみてください。"
    : "音声を認識できませんでした。マイク音量を確認し、もう少し長めにはっきり録音してください。";

  return {
    accuracyScore,
    fluencyScore,
    completenessScore,
    words,
    recognizedText,
    feedback,
  };
}

async function transcribeAndScore(audioFile: File, referenceText: string): Promise<AssessmentResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: TRANSCRIPTION_MODEL,
    language: "fa",
  });
  return scoreFromTranscription(referenceText, transcription.text || "");
}

/**
 * Pronunciation assessment using GPT-4o audio.
 *
 * Sends the user's WAV recording + reference text to GPT-4o-audio-preview,
 * which evaluates pronunciation with actual linguistic understanding of Persian.
 * Unlike STT-based approaches, this provides meaningful feedback even for
 * beginners whose pronunciation is far from native.
 */
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const referenceText = formData.get("referenceText") as string | null;

    if (!audioFile || !referenceText) {
      return NextResponse.json({ error: "audio and referenceText required" }, { status: 400 });
    }

    const audioBuffer = await audioFile.arrayBuffer();

    const wavStats = getWavStats(audioBuffer);
    if (wavStats) {
      console.log(`[pron-assess] RMS: ${wavStats.rms.toFixed(4)}, duration: ${Math.round(wavStats.durationMs)}ms`);
      if (wavStats.durationMs < 350 || wavStats.rms < 0.008) {
        return NextResponse.json({
          accuracyScore: 0,
          fluencyScore: 0,
          completenessScore: 0,
          words: getReferenceWords(referenceText).map((word) => ({ word, accuracyScore: 0 })),
          recognizedText: "",
          feedback: "音声が検出されませんでした。マイクに向かって発声してから録音を停止してください。",
        });
      }
    }

    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    console.log(`[pron-assess] GPT-4o audio, size: ${audioBuffer.byteLength}, ref: "${referenceText}"`);

    const refWords = getReferenceWords(referenceText);

    let raw = "";
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: PRONUNCIATION_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a Persian (Farsi) pronunciation evaluator for a Japanese learner.
You will receive audio of someone attempting to say a Persian phrase, plus the reference text.

Your task:
1. Listen carefully to the audio
2. Determine what the speaker actually said (or attempted to say)
3. Evaluate pronunciation quality for each word
4. Give encouraging, specific feedback in Japanese

CRITICAL SCORING RULES:
- This learner is a BEGINNER. Be encouraging but honest.
- If they attempted the phrase at all, give at least 15-25 points. Reserve 0 ONLY for silence or completely unrelated speech.
- 80-100: Native-like or very clear
- 60-79: Understandable, minor issues
- 40-59: Recognizable attempt, needs work
- 20-39: Difficult to understand but partially correct sounds
- 5-19: Very difficult but there was a genuine attempt
- 0: Silence only

For each word in the reference text, evaluate how well it was pronounced.
The reference text words are: ${refWords.map((w, i) => `${i + 1}. ${w}`).join(", ")}

Respond ONLY with a JSON object (no markdown, no code fences):
{
  "accuracyScore": <number 0-100>,
  "fluencyScore": <number 0-100>,
  "completenessScore": <number 0-100>,
  "words": [${refWords.map((w) => `{"word": "${w}", "accuracyScore": <number 0-100>}`).join(", ")}],
  "recognizedText": "<what you think they said in Persian script>",
  "feedback": "<1-2 sentences in Japanese: what was good, what to improve, specific sounds to focus on>"
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `The learner attempted to say: ${referenceText}`,
              },
              {
                type: "input_audio",
                input_audio: { data: base64Audio, format: "wav" },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      raw = completion.choices[0]?.message?.content || "";
    } catch (e) {
      console.error("[pron-assess] Audio model failed; falling back to transcription:", e);
      try {
        return NextResponse.json(await transcribeAndScore(audioFile, referenceText));
      } catch (fallbackError) {
        console.error("[pron-assess] Transcription fallback failed:", fallbackError);
        return NextResponse.json({
          accuracyScore: 0,
          fluencyScore: 0,
          completenessScore: 0,
          words: refWords.map((word) => ({ word, accuracyScore: 0 })),
          recognizedText: "",
          feedback: "音声評価サービスで一時的なエラーが発生しました。少し時間をおいてもう一度お試しください。",
        });
      }
    }

    console.log(`[pron-assess] GPT-4o response:`, raw.slice(0, 500));

    try {
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({
        accuracyScore: clampScore(parsed.accuracyScore),
        fluencyScore: clampScore(parsed.fluencyScore),
        completenessScore: clampScore(parsed.completenessScore),
        words: (parsed.words ?? []).map((w: { word: string; accuracyScore: number }) => ({
          word: w.word,
          accuracyScore: clampScore(w.accuracyScore),
        })),
        recognizedText: parsed.recognizedText ?? "",
        feedback: parsed.feedback ?? "",
      });
    } catch {
      console.error("[pron-assess] Failed to parse GPT-4o response:", raw);
      try {
        return NextResponse.json(await transcribeAndScore(audioFile, referenceText));
      } catch {
        return NextResponse.json({
          accuracyScore: 20,
          fluencyScore: 20,
          completenessScore: 20,
          words: refWords.map((w) => ({ word: w, accuracyScore: 20 })),
          recognizedText: "",
          feedback: raw || "評価を処理できませんでした。もう一度試してください。",
        });
      }
    }
  } catch (e) {
    console.error("[pron-assess] Error:", e);
    return NextResponse.json({ error: "Assessment failed. Please try again." }, { status: 500 });
  }
}
