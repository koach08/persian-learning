"use client";

import { useState, useRef, useCallback } from "react";
import { apiUrl } from "@/lib/api-config";

export interface TTSOptions {
  voice?: string;  // Azure voice name override
  lang?: "fa" | "ja";
  style?: "natural" | "slow" | "cheerful";
}

/**
 * TTS hook with Azure API + Web Speech API fallback.
 * iOS Safari requires user gesture to unlock audio — call unlock() on first tap.
 */
export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    const audio = new Audio();
    audio.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwMHAAAAAAD/+1DEAAAHAAGf9AAAIgAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7UMQbgAADSAAAAAAAAANIAAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
    audio.play().then(() => {
      audio.pause();
      unlockedRef.current = true;
    }).catch(() => {});
  }, []);

  /** Try Web Speech API as fallback */
  const speakWithWebSpeech = useCallback((text: string, lang: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "ja" ? "ja-JP" : "fa-IR";
      utterance.rate = 0.9;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      // Timeout safety — Web Speech can hang
      const timer = setTimeout(() => resolve(), 8000);
      utterance.onend = () => { clearTimeout(timer); resolve(); };
      utterance.onerror = () => { clearTimeout(timer); resolve(); };
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const play = useCallback(async (text: string, options?: TTSOptions): Promise<void> => {
    if (!text) return;
    setIsPlaying(true);
    try {
      const res = await fetch(apiUrl("/api/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: options?.voice,
          lang: options?.lang || "fa",
          style: options?.style || "natural",
        }),
      });
      if (!res.ok) throw new Error("TTS API failed");
      const blob = await res.blob();
      if (blob.size < 100) throw new Error("Empty audio");
      const url = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        if (audioRef.current) {
          audioRef.current.pause();
          URL.revokeObjectURL(audioRef.current.src);
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play().catch(() => {
          setIsPlaying(false);
          resolve();
        });
      });
    } catch {
      // Fallback: try Web Speech API
      try {
        await speakWithWebSpeech(text, options?.lang || "fa");
      } catch {
        // Silent failure
      }
      setIsPlaying(false);
    }
  }, [speakWithWebSpeech]);

  const playJa = useCallback(async (text: string, options?: Omit<TTSOptions, "lang">): Promise<void> => {
    return play(text, { ...options, lang: "ja" });
  }, [play]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  return { isPlaying, play, playJa, stop, unlock };
}
