"use client";

/**
 * Record audio directly as WAV PCM using Web Audio API.
 * Bypasses MediaRecorder entirely — no mp4/webm format issues on iOS.
 * Output: 16-bit PCM WAV at 16kHz mono (Azure-compatible).
 */

let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let workletNode: ScriptProcessorNode | null = null;
let chunks: Float32Array[] = [];
let recording = false;

export async function startWavRecording(): Promise<void> {
  chunks = [];
  recording = true;

  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  audioContext = new AudioCtx({ sampleRate: 16000 });

  const source = audioContext.createMediaStreamSource(mediaStream);

  // ScriptProcessorNode (deprecated but universally supported including iOS)
  workletNode = audioContext.createScriptProcessor(4096, 1, 1);
  workletNode.onaudioprocess = (e) => {
    if (!recording) return;
    const data = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));
  };

  source.connect(workletNode);
  workletNode.connect(audioContext.destination);
}

export function stopWavRecording(): Blob {
  recording = false;

  if (workletNode) {
    workletNode.disconnect();
    workletNode = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }

  const sampleRate = audioContext?.sampleRate || 16000;
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  // Merge chunks
  let totalLength = 0;
  for (const c of chunks) totalLength += c.length;
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  // Resample to 16kHz if audioContext used a different rate
  let samples = merged;
  if (sampleRate !== 16000) {
    const ratio = sampleRate / 16000;
    const newLen = Math.round(merged.length / ratio);
    samples = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
      const srcIdx = i * ratio;
      const idx = Math.floor(srcIdx);
      const frac = srcIdx - idx;
      samples[i] = idx + 1 < merged.length
        ? merged[idx] * (1 - frac) + merged[idx + 1] * frac
        : merged[idx] || 0;
    }
  }

  // Encode WAV
  const wavBuffer = encodeWav(samples, 16000);
  chunks = [];
  return new Blob([wavBuffer], { type: "audio/wav" });
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, "data");
  view.setUint32(40, numSamples * 2, true);

  let off = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    off += 2;
  }
  return buffer;
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
