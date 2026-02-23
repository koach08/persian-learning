import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text, voice } = await req.json();
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return NextResponse.json({ error: "Azure credentials not configured" }, { status: 500 });
  }

  const voiceName = voice || "fa-IR-DilaraNeural";
  const ssml = `<speak version='1.0' xml:lang='fa-IR'>
    <voice name='${voiceName}'>${escapeXml(text)}</voice>
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
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
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

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
