import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { original, userInput } = await req.json();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are a Persian dictation checker. Compare the user's input against the original text.
Return ONLY JSON (no markdown, no code fences):
{
  "accuracy": 85,
  "corrections": [
    {"original": "correct word", "userInput": "what user wrote", "isCorrect": false}
  ],
  "feedback": "feedback in Japanese",
  "tips": ["tip1 in Japanese", "tip2"]
}
- accuracy: percentage (0-100) based on word-level matching
- corrections: list each word/phrase, marking correct or incorrect
- feedback: encouraging feedback in Japanese
- tips: 1-3 improvement tips in Japanese
Be lenient with minor spelling variations in Persian.`,
        },
        {
          role: "user",
          content: `Original: ${original}\nUser input: ${userInput}`,
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
      });
    }
  } catch (e) {
    console.error("Dictation check error:", e);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
