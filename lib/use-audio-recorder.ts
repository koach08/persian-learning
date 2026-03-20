"use client";

import { useState, useCallback } from "react";
import { startWavRecording, stopWavRecording } from "./wav-recorder";
import { apiUrl } from "@/lib/api-config";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");

  const startRecording = useCallback(async () => {
    try {
      await startWavRecording();
      setIsRecording(true);
    } catch {
      alert("マイクへのアクセスが許可されていません。");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    setIsRecording(false);

    try {
      const wavBlob = stopWavRecording();

      if (wavBlob.size < 1000) {
        setTranscribedText("");
        return;
      }

      setIsTranscribing(true);

      const formData = new FormData();
      formData.append("audio", wavBlob, "recording.wav");

      fetch(apiUrl("/api/whisper"), { method: "POST", body: formData })
        .then((res) => res.json())
        .then((data) => {
          setTranscribedText(data.text?.trim() || "");
        })
        .catch(() => {
          console.error("Whisper transcription failed");
          setTranscribedText("");
        })
        .finally(() => {
          setIsTranscribing(false);
        });
    } catch {
      console.error("Stop recording error");
    }
  }, [isRecording]);

  const clearText = useCallback(() => {
    setTranscribedText("");
  }, []);

  return {
    isRecording,
    isTranscribing,
    transcribedText,
    startRecording,
    stopRecording,
    clearText,
  };
}
