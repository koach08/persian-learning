import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT_CONVERSATION = `You are a friendly Persian language tutor. The user is Japanese and learning Farsi.
Their spouse is Iranian. Rules:
- Respond primarily in Persian (Farsi / fa-IR)
- Add romanization in parentheses for new vocabulary
- Correct grammar mistakes gently in Japanese
- Use colloquial spoken Farsi, not formal written Farsi
- Keep sentences simple for beginner-intermediate level
- Simulate everyday family conversations when asked`;

const SYSTEM_PROMPT_CORRECTION = `You are a Persian language tutor focusing on grammar correction.
The user is Japanese and learning Farsi. Rules:
- When the user writes in Persian, check for grammar mistakes
- Explain corrections in Japanese
- Show the corrected sentence in Persian with romanization
- Be encouraging and gentle
- Also explain why the correction is needed`;

export async function POST(req: NextRequest) {
  const { messages, mode } = await req.json();

  const systemPrompt =
    mode === "correction" ? SYSTEM_PROMPT_CORRECTION : SYSTEM_PROMPT_CONVERSATION;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 500,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    });

    return NextResponse.json({
      content: completion.choices[0].message.content,
    });
  } catch (e) {
    console.error("Chat API error:", e);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
