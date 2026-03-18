import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { mode, word, level } = await req.json();

  let prompt = "";

  if (mode === "cloze") {
    prompt = `You are a Persian language exercise generator for a ${level} level learner (Japanese native).
Generate a fill-in-the-blank exercise using the Persian word "${word}".

Return ONLY valid JSON (no markdown, no code blocks):
{
  "sentence": "the full sentence in Persian with ___ replacing the target word",
  "answer": "${word}",
  "hint": "a brief hint in Japanese",
  "translation": "Japanese translation of the full sentence"
}

Rules:
- The sentence should be appropriate for ${level} level
- A1: very simple (3-5 words), A2: simple (5-7 words), B1: moderate, B2: complex
- Use colloquial spoken Farsi`;
  } else if (mode === "sentence-build") {
    prompt = `You are a Persian language exercise generator for a ${level} level learner (Japanese native).
Generate a sentence ordering exercise appropriate for ${level} level.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "sentence": "the correct sentence in Persian",
  "words": ["array", "of", "individual", "Persian", "words", "in", "scrambled", "order"],
  "romanization": "romanization of the correct sentence",
  "translation": "Japanese translation"
}

Rules:
- A1: 3-4 words, A2: 4-5 words, B1: 5-7 words, B2: 7+ words
- Use colloquial spoken Farsi
- Make sure the scrambled order is different from the correct order`;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      temperature: 0.8,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message.content || "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    return NextResponse.json(data);
  } catch (e) {
    console.error("Exercise API error:", e);
    return NextResponse.json({ error: "Exercise generation failed" }, { status: 500 });
  }
}
