import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { level } = await req.json();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `Generate 2 short Persian listening practice materials for CEFR level ${level || "A1"}.
Return ONLY a JSON array (no markdown, no code fences):
[{
  "id": "1",
  "title": "Persian title",
  "titleJa": "Japanese title",
  "script": "Persian script text (2-4 sentences for A1, longer for higher levels)",
  "scriptRomanized": "romanized version",
  "translation": "Japanese translation",
  "level": "${level || "A1"}",
  "vocabulary": [{"persian": "word", "romanized": "rom", "japanese": "meaning"}],
  "quiz": [{"question": "question in Japanese", "options": ["opt1","opt2","opt3"], "correctIndex": 0, "explanation": "explanation in Japanese"}]
}]
Use Iranian Persian (فارسی). Keep it natural and conversational.
For A1: very simple greetings, numbers, basic phrases. 2-3 sentences max.
For A2: everyday topics. 3-4 sentences.
For B1+: longer, more complex content.`,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "[]";
    try {
      const materials = JSON.parse(raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      return NextResponse.json({ materials });
    } catch {
      return NextResponse.json({ materials: [], error: "Parse error" });
    }
  } catch (e) {
    console.error("Listening generate error:", e);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
