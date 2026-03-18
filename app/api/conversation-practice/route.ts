import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getTurnCount(level: string): { aiTurns: number; userTurns: number; wordCount: string } {
  switch (level) {
    case "A1": return { aiTurns: 2, userTurns: 2, wordCount: "2-4語" };
    case "A2": return { aiTurns: 3, userTurns: 3, wordCount: "5-7語" };
    case "B1": return { aiTurns: 3, userTurns: 3, wordCount: "フル文" };
    case "B2": return { aiTurns: 4, userTurns: 4, wordCount: "フル文" };
    default: return { aiTurns: 2, userTurns: 2, wordCount: "2-4語" };
  }
}

export async function POST(req: NextRequest) {
  const { action, scenarioId, scenarioTitle, level, userText, expectedText, alternatives } = await req.json();

  try {
    if (action === "generate") {
      const { aiTurns, userTurns, wordCount } = getTurnCount(level);
      const totalTurns = aiTurns + userTurns;

      const prompt = `You are a Persian (Farsi) language scenario generator for Japanese learners at CEFR ${level} level.

Generate a realistic conversation scenario for: "${scenarioTitle}" (${scenarioId})

CRITICAL: Use IRANIAN PERSIAN (فارسی), Tehran colloquial style, NOT Arabic.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "title": "${scenarioTitle}",
  "titlePersian": "ペルシア語のタイトル",
  "level": "${level}",
  "description": "場面説明（日本語、2-3文）",
  "speakers": [
    {"name": "話者のペルシア語名", "gender": "male or female", "role": "役割（日本語）"},
    {"name": "話者のペルシア語名", "gender": "male or female", "role": "役割（日本語）"}
  ],
  "vocabulary": [
    {"persian": "単語", "romanization": "ローマ字", "japanese": "意味"},
    ... (4-6 key words for this scenario)
  ],
  "dialogue": [
    {
      "speaker": "ai",
      "speakerName": "話者のペルシア語名(speakersの名前と一致)",
      "gender": "male or female",
      "persian": "ペルシア語文",
      "romanization": "ローマ字",
      "japanese": "日本語訳",
      "alternatives": [],
      "hints": []
    },
    {
      "speaker": "user",
      "speakerName": "話者のペルシア語名",
      "gender": "male or female",
      "persian": "期待されるペルシア語回答",
      "romanization": "ローマ字",
      "japanese": "日本語訳（これがユーザーに表示されるプロンプト）",
      "alternatives": ["別の言い方1", "別の言い方2"],
      "hints": ["ヒント1（日本語）", "ヒント2（日本語）", "正解のローマ字"]
    },
    ... (交互にai, userを繰り返す)
  ]
}

Rules:
- Total ${totalTurns} turns (${aiTurns} AI + ${userTurns} user), alternating ai/user starting with ai
- User utterances should be ${wordCount} in length
- For user turns: provide 2-3 alternatives (acceptable variations) and 3 hints (getting progressively more helpful, last hint = romanization of answer)
- For AI turns: alternatives and hints can be empty arrays
- Use natural, colloquial Tehran Farsi
- Vocabulary list should cover the key words the user will need
- A1/A2: include romanization for all Persian text; B1/B2: include for new/difficult words only
- IMPORTANT: Give each speaker a realistic Iranian name. Use common Iranian names.
  - Choose genders that fit the scenario naturally (e.g., a male shopkeeper and female customer, or two friends of different genders)
  - The "gender" field must be either "male" or "female"
  - speakerName must match one of the names in the speakers array`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2000,
        temperature: 0.8,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = completion.choices[0].message.content || "{}";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      return NextResponse.json(data);

    } else if (action === "evaluate") {
      const prompt = `You are a Persian language evaluator for a Japanese learner.

The learner was supposed to say: "${expectedText}"
${alternatives?.length ? `Acceptable alternatives: ${alternatives.join(", ")}` : ""}

The learner actually said: "${userText}"

Evaluate the response considering:
1. Semantic meaning (most important) - did they communicate the same idea?
2. Grammar accuracy
3. Vocabulary choice

Return ONLY valid JSON:
{
  "score": <0-100 number>,
  "feedback": "日本語でのフィードバック（1-2文）",
  "correction": "修正案（ペルシア語）。正解の場合は空文字"
}

Scoring guide:
- 90-100: Perfect or near-perfect, same meaning expressed correctly
- 70-89: Good, minor errors but meaning is clear
- 50-69: Understandable but with noticeable errors
- 30-49: Partially correct, meaning is unclear
- 0-29: Very different from expected or incomprehensible`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 300,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = completion.choices[0].message.content || "{}";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("Conversation practice API error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
