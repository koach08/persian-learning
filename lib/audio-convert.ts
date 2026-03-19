/**
 * Convert any audio blob (mp4/webm/etc) to WAV PCM format
 * suitable for Azure Speech SDK.
 * Uses Web Audio API to decode → re-encode as 16-bit 16kHz mono WAV.
 */
export async function convertToWav(audioBlob: Blob): Promise<ArrayBuffer> {
  const arrayBuffer = await audioBlob.arrayBuffer();

  // iOS may not support creating AudioContext with specific sampleRate,
  // so create with default and resample manually
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioCtx();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    audioContext.close();
  }

  // Get mono channel
  let channelData: Float32Array;
  if (audioBuffer.numberOfChannels > 1) {
    const length = audioBuffer.length;
    channelData = new Float32Array(length);
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.getChannelData(1);
    for (let i = 0; i < length; i++) {
      channelData[i] = (ch0[i] + ch1[i]) / 2;
    }
  } else {
    channelData = audioBuffer.getChannelData(0);
  }

  // Resample to 16kHz
  const targetRate = 16000;
  const srcRate = audioBuffer.sampleRate;
  let samples: Float32Array;

  if (srcRate !== targetRate) {
    const ratio = srcRate / targetRate;
    const newLength = Math.round(channelData.length / ratio);
    samples = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIdx = i * ratio;
      const idx = Math.floor(srcIdx);
      const frac = srcIdx - idx;
      if (idx + 1 < channelData.length) {
        samples[i] = channelData[idx] * (1 - frac) + channelData[idx + 1] * frac;
      } else {
        samples[i] = channelData[idx] || 0;
      }
    }
  } else {
    samples = channelData;
  }

  // Encode as WAV
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(view, 8, "WAVE");

  // fmt chunk
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, targetRate, true);   // sample rate
  view.setUint32(28, targetRate * 2, true); // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits per sample

  // data chunk
  writeStr(view, 36, "data");
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return buffer;
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
