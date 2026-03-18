import { NextRequest, NextResponse } from "next/server";

/**
 * TTS API with natural-sounding SSML prosody.
 *
 * Body params:
 *   text      - text to speak (required)
 *   voice     - Azure Neural voice name (optional, auto-detected from lang)
 *   lang      - "fa" | "ja" (optional, default "fa")
 *   style     - "natural" | "slow" | "cheerful" (optional, default "natural")
 */

const DEFAULT_VOICES: Record<string, string> = {
  fa: "fa-IR-DilaraNeural",
  ja: "ja-JP-NanamiNeural",
};

const LANG_TAGS: Record<string, string> = {
  fa: "fa-IR",
  ja: "ja-JP",
};

export async function POST(req: NextRequest) {
  const { text, voice, lang = "fa", style = "natural" } = await req.json();
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return NextResponse.json({ error: "Azure credentials not configured" }, { status: 500 });
  }

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const voiceName = voice || DEFAULT_VOICES[lang] || DEFAULT_VOICES.fa;
  const langTag = LANG_TAGS[lang] || LANG_TAGS.fa;
  const prosody = buildProsody(style);

  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${langTag}'>
  <voice name='${voiceName}'>
    <prosody ${prosody}>
      ${escapeXml(text)}
    </prosody>
  </voice>
</speak>`;

  const tokenRes = await fetch(
    `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Length": "0",
      },
    }
  );

  if (!tokenRes.ok) {
    return NextResponse.json({ error: "Token fetch failed" }, { status: 500 });
  }

  const token = await tokenRes.text();

  const ttsRes = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
      },
      body: ssml,
    }
  );

  if (!ttsRes.ok) {
    return NextResponse.json({ error: "TTS synthesis failed" }, { status: 500 });
  }

  const audioBuffer = await ttsRes.arrayBuffer();
  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

function buildProsody(style: string): string {
  switch (style) {
    case "slow":
      return `rate="-15%" pitch="+0%"`;
    case "cheerful":
      return `rate="+5%" pitch="+5%"`;
    case "natural":
    default:
      // Slight variation for more natural feel
      return `rate="-5%" pitch="+0%"`;
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
