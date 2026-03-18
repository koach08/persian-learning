"use client";

import { useState, useRef, useCallback } from "react";
import { apiUrl } from "@/lib/api-config";

export interface TTSOptions {
  voice?: string;  // Azure voice name override
  lang?: "fa" | "ja";
  style?: "natural" | "slow" | "cheerful";
}

/**
 * iOS Safari blocks audio.play() unless called directly from a user gesture.
 * We work around this by:
 * 1. Creating and "unlocking" an Audio element on the first user tap
 * 2. Reusing that same element for subsequent plays
 */
export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  // Call this on any user tap to unlock audio for iOS
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    const audio = new Audio();
    // Play a tiny silent data URI to "unlock" the audio context
    audio.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwMHAAAAAAD/+1DEAAAHAAGf9AAAIgAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7UMQbgAADSAAAAAAAAANIAAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
    audio.play().then(() => {
      audio.pause();
      unlockedRef.current = true;
    }).catch(() => {
      // Ignore — will retry on next tap
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
      if (!res.ok) {
        setIsPlaying(false);
        return;
      }
      const blob = await res.blob();
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
          resolve();
        };
        audio.play().catch(() => {
          // iOS autoplay blocked — don't crash, just mark as not playing
          setIsPlaying(false);
          resolve();
        });
      });
    } catch {
      setIsPlaying(false);
    }
  }, []);

  /** Convenience: play Japanese text with Japanese voice */
  const playJa = useCallback(async (text: string, options?: Omit<TTSOptions, "lang">): Promise<void> => {
    return play(text, { ...options, lang: "ja" });
  }, [play]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return { isPlaying, play, playJa, stop, unlock };
}
