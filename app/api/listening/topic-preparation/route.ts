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
          content: `Generate topic preparation material for Persian listening practice.
Topic: "${topic}", CEFR level: ${level || "A1"}.
Return ONLY JSON (no markdown, no code fences):
{
  "topic": "topic in Persian",
  "topicJa": "topic in Japanese",
  "keyVocabulary": [
    {"persian": "word", "romanized": "rom", "japanese": "meaning", "example": "example sentence in Persian"}
  ],
  "usefulPhrases": [
    {"persian": "phrase", "romanized": "rom", "japanese": "meaning"}
  ],
  "backgroundInfo": "background info in Japanese (2-3 sentences)",
  "listeningTips": ["tip1 in Japanese", "tip2"]
}
Provide 5-8 key vocabulary items and 4-6 useful phrases.
Use Iranian Persian (فارسی).`,
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
    console.error("Topic prep error:", e);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
