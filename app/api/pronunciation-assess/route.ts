import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    console.log(`[pron-assess] GPT-4o audio, size: ${audioBuffer.byteLength}, ref: "${referenceText}"`);

    const refWords = referenceText
      .replace(/[.،؟!؛:«»\-\u200c]/g, "")
      .split(/\s+/)
      .filter(Boolean);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-audio-preview",
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

    const raw = completion.choices[0]?.message?.content || "";
    console.log(`[pron-assess] GPT-4o response:`, raw.slice(0, 500));

    try {
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({
        accuracyScore: parsed.accuracyScore ?? 0,
        fluencyScore: parsed.fluencyScore ?? 0,
        completenessScore: parsed.completenessScore ?? 0,
        words: (parsed.words ?? []).map((w: { word: string; accuracyScore: number }) => ({
          word: w.word,
          accuracyScore: w.accuracyScore ?? 0,
        })),
        recognizedText: parsed.recognizedText ?? "",
        feedback: parsed.feedback ?? "",
      });
    } catch {
      console.error("[pron-assess] Failed to parse GPT-4o response:", raw);
      return NextResponse.json({
        accuracyScore: 20,
        fluencyScore: 20,
        completenessScore: 20,
        words: refWords.map((w) => ({ word: w, accuracyScore: 20 })),
        recognizedText: "",
        feedback: raw || "評価を処理できませんでした。もう一度試してください。",
      });
    }
  } catch (e) {
    console.error("[pron-assess] Error:", e);
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 });
  }
}
