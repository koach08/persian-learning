import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { topicId, topicTitle, level, existingQuestions } = await req.json();

  const prompt = `You are a Persian grammar exercise generator for a ${level} level learner (Japanese native speaker).

Topic: ${topicTitle} (${topicId})

Generate 3 NEW grammar questions about this topic. Do NOT repeat these existing questions:
${existingQuestions || "none"}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "questions": [
    {
      "type": "multiple-choice",
      "question": "question text in Japanese",
      "options": ["option1 in Persian", "option2", "option3", "option4"],
      "correctIndex": 0,
      "explanation": "explanation in Japanese"
    },
    {
      "type": "fill-in",
      "question": "instruction in Japanese",
      "sentence": "Persian sentence with ___ for the blank",
      "answer": "correct answer in Persian",
      "hint": "hint in Japanese",
      "explanation": "explanation in Japanese"
    },
    {
      "type": "error-correction",
      "question": "instruction in Japanese",
      "sentence": "Persian sentence WITH an error",
      "corrected": "correct version",
      "explanation": "explanation in Japanese of what was wrong"
    }
  ]
}

Rules:
- ${level} level appropriate complexity
- A1: very basic, A2: elementary, B1: intermediate, B2: upper-intermediate
- All instructions and explanations in Japanese
- Persian text should use standard Persian script
- Vary question types (use all three types)
- Focus on practical, commonly-used grammar patterns`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      temperature: 0.8,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message.content || "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    return NextResponse.json(data);
  } catch (e) {
    console.error("Grammar API error:", e);
    return NextResponse.json({ error: "Grammar question generation failed" }, { status: 500 });
  }
}
