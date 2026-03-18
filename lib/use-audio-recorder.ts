"use client";

import { useState, useRef, useCallback } from "react";
import { getSupportedMimeType } from "./audio-utils";
import { apiUrl } from "@/lib/api-config";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mimeType, extension } = getSupportedMimeType();

      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;

      const mediaRecorder = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blobType = mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });

        if (audioBlob.size < 1000) {
          // Too short — signal that transcription is done (empty)
          setIsTranscribing(true);
          setTranscribedText("");
          setIsTranscribing(false);
          return;
        }

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, `recording.${extension}`);
          const res = await fetch(apiUrl("/api/whisper"), { method: "POST", body: formData });
          const data = await res.json();
          setTranscribedText(data.text?.trim() || "");
        } catch {
          console.error("Whisper transcription failed");
          setTranscribedText("");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert("マイクへのアクセスが許可されていません。");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

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
