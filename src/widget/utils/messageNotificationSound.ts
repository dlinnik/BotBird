let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    const AudioCtx =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }

  return audioContext;
}

/** Call after user opens the chat so autoplay policies allow notification sounds. */
export async function unlockMessageNotificationSound(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'suspended') return;
  await ctx.resume().catch(() => undefined);
}

export async function playIncomingMessageSound(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => undefined);
    if (ctx.state === 'suspended') return;
  }

  const start = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, start);
  oscillator.frequency.setValueAtTime(1174, start + 0.1);

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(start);
  oscillator.stop(start + 0.35);
}
