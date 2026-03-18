/**
 * iOS-compatible MIME type detection for MediaRecorder.
 * Safari does not support audio/webm, so we fall back to audio/mp4.
 */
export function getSupportedMimeType(): { mimeType: string; extension: string } {
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "", extension: "webm" };
  }

  // Prefer webm (Chrome, Firefox, Android)
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return { mimeType: "audio/webm;codecs=opus", extension: "webm" };
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) {
    return { mimeType: "audio/webm", extension: "webm" };
  }

  // Fallback for iOS Safari
  if (MediaRecorder.isTypeSupported("audio/mp4")) {
    return { mimeType: "audio/mp4", extension: "mp4" };
  }
  if (MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a.40.2")) {
    return { mimeType: "audio/mp4;codecs=mp4a.40.2", extension: "mp4" };
  }

  // Let the browser decide
  return { mimeType: "", extension: "webm" };
}
