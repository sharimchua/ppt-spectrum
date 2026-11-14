/**
 * Shared microphone stream acquisition helper for capture tabs.
 */
export async function acquireCaptureAudioStream(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw new Error('Microphone access requires a secure context (HTTPS or localhost).');
    }
    throw new Error('Microphone input is not supported in this browser environment.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  } catch {
    // Fallback for browser audio drivers that reject raw audio constraints
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}
