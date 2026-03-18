import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { topic, level } = await req.json();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `Generate a Persian listening material about "${topic}" for CEFR level ${level || "A1"}.
Return ONLY JSON (no markdown, no code fences):
{
  "title": "Persian title",
  "titleJa": "Japanese title",
  "script": "Persian script (natural dialogue or monologue, 3-6 sentences)",
  "scriptRomanized": "romanized version",
  "translation": "Japanese translation",
  "vocabulary": [{"persian": "word", "romanized": "rom", "japanese": "meaning"}],
  "quiz": [{"question": "question in Japanese", "options": ["opt1","opt2","opt3"], "correctIndex": 0, "explanation": "explanation in Japanese"}]
}
Use Iranian Persian (فارسی). Make the content engaging and practical.`,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";
    try {
      const data = JSON.parse(raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: "Parse error" }, { status: 500 });
    }
  } catch (e) {
    console.error("Material generate error:", e);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
