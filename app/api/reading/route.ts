import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { level, topic } = await req.json();

  const wordCounts: Record<string, string> = {
    A1: "30-50",
    A2: "50-80",
    B1: "80-120",
    B2: "120-180",
  };

  const topicSuggestions: Record<string, string[]> = {
    A1: ["自己紹介", "家族", "日常の挨拶", "食べ物", "色と数字"],
    A2: ["買い物", "レストラン", "天気", "趣味", "街の説明"],
    B1: ["旅行の体験", "文化の違い", "仕事と将来", "健康", "イランの祭り"],
    B2: ["社会問題", "技術と生活", "文学", "歴史", "環境問題"],
  };

  const selectedTopic = topic || topicSuggestions[level]?.[Math.floor(Math.random() * 5)] || "日常生活";

  const prompt = `You are a Persian reading comprehension exercise generator for a ${level} level learner (Japanese native speaker).

Generate a reading passage and comprehension questions about: ${selectedTopic}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "title": "passage title in Persian",
  "titleJapanese": "passage title in Japanese",
  "passage": "Persian text passage (${wordCounts[level] || "50-80"} words, appropriate for ${level} level)",
  "romanization": "full romanization of the passage",
  "translation": "Japanese translation of the full passage",
  "vocabulary": [
    {
      "persian": "key word",
      "romanization": "romanization",
      "japanese": "Japanese meaning"
    }
  ],
  "questions": [
    {
      "question": "comprehension question in Japanese",
      "options": ["option1 in Persian", "option2", "option3"],
      "correctIndex": 0,
      "explanation": "explanation in Japanese"
    },
    {
      "question": "second question in Japanese",
      "options": ["option1", "option2", "option3"],
      "correctIndex": 1,
      "explanation": "explanation in Japanese"
    },
    {
      "question": "third question in Japanese",
      "options": ["option1", "option2", "option3"],
      "correctIndex": 2,
      "explanation": "explanation in Japanese"
    }
  ]
}

Rules:
- ${level} level appropriate vocabulary and grammar
- A1: very simple sentences, basic vocab only
- A2: simple but slightly longer sentences
- B1: moderate complexity, some compound sentences
- B2: natural, complex text with nuanced vocabulary
- Use colloquial spoken Farsi for A1-A2, mix of formal/informal for B1-B2
- Include 4-6 key vocabulary words
- Generate exactly 3 comprehension questions
- Questions should test understanding, not just word recognition`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1200,
      temperature: 0.8,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message.content || "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    return NextResponse.json(data);
  } catch (e) {
    console.error("Reading API error:", e);
    return NextResponse.json({ error: "Reading passage generation failed" }, { status: 500 });
  }
}
