import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side pronunciation assessment using Azure REST API.
 * Sends audio with its REAL content type (mp4/webm/wav).
 * Azure Speech API may accept multiple formats.
 * Falls back to SDK if REST fails.
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
    const fileName = audioFile.name || "recording";
    const realContentType = audioFile.type || "audio/wav";

    console.log(`[pron-assess] file: ${fileName}, size: ${audioBuffer.byteLength}, type: ${realContentType}, ref: "${referenceText}"`);

    // Get Azure token
    const tokenRes = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      { method: "POST", headers: { "Ocp-Apim-Subscription-Key": key, "Content-Length": "0" } }
    );
    if (!tokenRes.ok) {
      return NextResponse.json({ error: "Token fetch failed" }, { status: 500 });
    }
    const token = await tokenRes.text();

    // Pronunciation assessment config
    const pronConfig = {
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Word",
      Dimension: "Comprehensive",
      EnableMiscue: true,
    };
    const pronConfigBase64 = Buffer.from(JSON.stringify(pronConfig)).toString("base64");

    // Client now sends WAV directly — try WAV first, then original type
    const contentTypesToTry = [
      "audio/wav; codecs=audio/pcm; samplerate=16000",
      "audio/wav",
      realContentType,
    ];

    let lastError = "";
    for (const contentType of contentTypesToTry) {
      try {
        const assessRes = await fetch(
          `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=fa-IR&format=detailed`,
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
          lastError = `${contentType}: ${assessRes.status} ${await assessRes.text().catch(() => "")}`;
          console.log(`[pron-assess] Failed with ${contentType}: ${assessRes.status}`);
          continue;
        }

        const result = await assessRes.json();
        console.log(`[pron-assess] Success with ${contentType}:`, JSON.stringify(result).slice(0, 300));

        const nbest = result?.NBest?.[0];
        if (!nbest) {
          return NextResponse.json({
            accuracyScore: 0, fluencyScore: 0, completenessScore: 0,
            words: [], recognizedText: result?.DisplayText || "",
            debug: `RecognitionStatus: ${result?.RecognitionStatus}`,
          });
        }

        const pa = nbest.PronunciationAssessment || {};
        const words = (nbest.Words || []).map((w: {
          Word: string;
          PronunciationAssessment?: { AccuracyScore: number };
        }) => ({
          word: w.Word,
          accuracyScore: Math.round(w.PronunciationAssessment?.AccuracyScore ?? 0),
        }));

        return NextResponse.json({
          accuracyScore: Math.round(pa.AccuracyScore ?? 0),
          fluencyScore: Math.round(pa.FluencyScore ?? 0),
          completenessScore: Math.round(pa.CompletenessScore ?? 0),
          words,
          recognizedText: nbest.Display || result?.DisplayText || "",
        });
      } catch (e) {
        lastError = `${contentType}: ${e instanceof Error ? e.message : String(e)}`;
        continue;
      }
    }

    // All content types failed
    return NextResponse.json({
      error: "All format attempts failed",
      debug: lastError,
      accuracyScore: 0, fluencyScore: 0, completenessScore: 0,
      words: [], recognizedText: "",
    });
  } catch (e) {
    console.error("[pron-assess] Error:", e);
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 });
  }
}
