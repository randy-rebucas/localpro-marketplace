/**
 * Plays a brief, pleasant chime using the Web Audio API.
 *
 * Two-tone ascending ping (440 Hz → 660 Hz) with a short decay.
 * Silently no-ops if: *   - the browser hasn't received a user gesture yet (autoplay policy)
 *   - AudioContext is not supported
 *   - the call throws for any reason
 */
export function playNotificationSound(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      // Browser blocked autoplay — resume() requires a prior user gesture;
      // if it hasn't happened yet, skip the sound silently.
      ctx.resume().then(() => _chime(ctx)).catch(() => ctx.close());
      return;
    }
    _chime(ctx);
  } catch {
    // Ignore — never break the notification flow because of audio
  }
}

function _chime(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // First tone — 440 Hz (A4)
  _tone(ctx, 440, now, 0.18);

  // Second tone — 660 Hz (E5), slightly delayed and quieter
  _tone(ctx, 660, now + 0.10, 0.12);
}

function _tone(ctx: AudioContext, frequency: number, startAt: number, duration: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);

  // Quick fade-in then decay to silence
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.25, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
  oscillator.onended = () => {
    gain.disconnect();
    oscillator.disconnect();
    // Close the context only after the last tone finishes
    if (startAt + duration >= ctx.currentTime + 0.1) {
      ctx.close().catch(() => undefined);
    }
  };
}
