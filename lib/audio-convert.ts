/**
 * Convert any audio blob (mp4/webm/etc) to WAV PCM format
 * suitable for Azure Speech SDK.
 * Uses Web Audio API to decode → re-encode as 16-bit 16kHz mono WAV.
 */
export async function convertToWav(audioBlob: Blob): Promise<ArrayBuffer> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
    sampleRate: 16000,
  });

  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  audioContext.close();

  // Get mono channel (mix down if stereo)
  const channelData = audioBuffer.numberOfChannels > 1
    ? mixToMono(audioBuffer)
    : audioBuffer.getChannelData(0);

  // Resample to 16kHz if needed
  const samples = audioBuffer.sampleRate !== 16000
    ? resample(channelData, audioBuffer.sampleRate, 16000)
    : channelData;

  return encodeWav(samples, 16000);
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const result = new Float32Array(length);
  const channels = buffer.numberOfChannels;
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      sum += buffer.getChannelData(ch)[i];
    }
    result[i] = sum / channels;
  }
  return result;
}

function resample(data: Float32Array, fromRate: number, toRate: number): Float32Array {
  const ratio = fromRate / toRate;
  const newLength = Math.round(data.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio;
    const idx = Math.floor(srcIdx);
    const frac = srcIdx - idx;
    result[i] = idx + 1 < data.length
      ? data[idx] * (1 - frac) + data[idx + 1] * frac
      : data[idx];
  }
  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, 1, true);  // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);  // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, numSamples * 2, true);

  // PCM samples (16-bit)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
