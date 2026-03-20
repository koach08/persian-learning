import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side pronunciation assessment using Azure REST API (no SDK needed).
 * POST: multipart form with "audio" file + "referenceText" string
 * Returns: { accuracyScore, fluencyScore, completenessScore, words[] }
 */
export async function POST(req: NextRequest) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return NextResponse.json({ error: "Azure credentials not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const referenceText = formData.get("referenceText") as string | null;

    if (!audioFile || !referenceText) {
      return NextResponse.json({ error: "audio and referenceText required" }, { status: 400 });
    }

    const audioBuffer = await audioFile.arrayBuffer();

    // Step 1: Get Azure token
    const tokenRes = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: { "Ocp-Apim-Subscription-Key": key, "Content-Length": "0" },
      }
    );
    if (!tokenRes.ok) {
      return NextResponse.json({ error: "Token fetch failed" }, { status: 500 });
    }
    const token = await tokenRes.text();

    // Step 2: Call pronunciation assessment REST API
    const pronConfig = {
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Word",
      Dimension: "Comprehensive",
      EnableMiscue: true,
    };

    const pronConfigBase64 = Buffer.from(JSON.stringify(pronConfig)).toString("base64");

    // Detect content type from file
    const contentType = audioFile.type || "audio/wav";

    const assessRes = await fetch(
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=fa-IR`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": contentType,
          "Pronunciation-Assessment": pronConfigBase64,
          Accept: "application/json",
        },
        body: audioBuffer,
      }
    );

    if (!assessRes.ok) {
      const errText = await assessRes.text();
      console.error("Azure assessment error:", assessRes.status, errText);
      return NextResponse.json({ error: "Assessment failed", detail: errText }, { status: 500 });
    }

    const result = await assessRes.json();

    // Parse results
    const nbest = result?.NBest?.[0];
    if (!nbest) {
      return NextResponse.json({
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        words: [],
        recognizedText: result?.DisplayText || "",
      });
    }

    const pronAssessment = nbest.PronunciationAssessment || {};
    const words = (nbest.Words || []).map((w: {
      Word: string;
      PronunciationAssessment?: { AccuracyScore: number };
    }) => ({
      word: w.Word,
      accuracyScore: Math.round(w.PronunciationAssessment?.AccuracyScore ?? 0),
    }));

    return NextResponse.json({
      accuracyScore: Math.round(pronAssessment.AccuracyScore ?? 0),
      fluencyScore: Math.round(pronAssessment.FluencyScore ?? 0),
      completenessScore: Math.round(pronAssessment.CompletenessScore ?? 0),
      words,
      recognizedText: nbest.Display || result?.DisplayText || "",
    });
  } catch (e) {
    console.error("Pronunciation assessment error:", e);
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 });
  }
}
