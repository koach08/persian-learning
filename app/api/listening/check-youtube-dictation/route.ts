import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { transcript, userInput, videoTitle } = await req.json();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are a Persian dictation checker for YouTube video "${videoTitle || "unknown"}".
Compare the user's dictation against the transcript.
Return ONLY JSON (no markdown, no code fences):
{
  "accuracy": 85,
  "corrections": [{"original": "correct", "userInput": "user wrote", "isCorrect": false}],
  "feedback": "feedback in Japanese",
  "tips": ["tip in Japanese"],
  "vocabularyNotes": [{"persian": "word", "romanized": "rom", "japanese": "meaning"}]
}
Be lenient with minor Persian spelling variations.`,
        },
        {
          role: "user",
          content: `Transcript: ${transcript}\nUser dictation: ${userInput}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";
    try {
      const result = JSON.parse(raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({
        accuracy: 0,
        corrections: [],
        feedback: "チェックに失敗しました。",
        tips: [],
        vocabularyNotes: [],
      });
    }
  } catch (e) {
    console.error("YouTube dictation check error:", e);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
