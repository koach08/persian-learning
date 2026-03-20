"use client";

import { useState, useCallback } from "react";
import { startWavRecording, stopWavRecording } from "@/lib/wav-recorder";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  className?: string;
}

export default function AudioRecorder({
  onRecordingComplete,
  className = "",
}: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);

  const startRecording = useCallback(async () => {
    try {
      await startWavRecording();
      setRecording(true);
    } catch (e) {
      console.error("Microphone error:", e);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!recording) return;
    setRecording(false);
    try {
      const wavBlob = stopWavRecording();
      onRecordingComplete(wavBlob);
    } catch (e) {
      console.error("Stop recording error:", e);
    }
  }, [recording, onRecordingComplete]);

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      className={`inline-flex items-center justify-center w-16 h-16 rounded-full transition-all ${
        recording
          ? "bg-red-500 hover:bg-red-600 animate-pulse"
          : "bg-emerald-500 hover:bg-emerald-600"
      } text-white shadow-lg ${className}`}
      title={recording ? "録音停止" : "録音開始"}
    >
      {recording ? (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
        </svg>
      )}
    </button>
  );
}
