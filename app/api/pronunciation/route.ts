import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return NextResponse.json({ error: "Azure credentials not configured" }, { status: 500 });
  }

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
  return NextResponse.json({ token, region });
}
