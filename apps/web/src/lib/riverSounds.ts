export type RiverSound = 'pick' | 'drop' | 'cross' | 'conflict' | 'win' | 'lose';

interface Note {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

const SOUNDS: Record<RiverSound, Note[]> = {
  pick: [{ freq: 660, start: 0, duration: 0.08 }],
  drop: [{ freq: 440, start: 0, duration: 0.08 }],
  cross: [
    { freq: 220, start: 0, duration: 0.25, type: 'triangle' },
    { freq: 262, start: 0.2, duration: 0.3, type: 'triangle' },
  ],
  conflict: [
    { freq: 180, start: 0, duration: 0.18, type: 'sawtooth', gain: 0.12 },
    { freq: 140, start: 0.18, duration: 0.25, type: 'sawtooth', gain: 0.12 },
  ],
  win: [
    { freq: 523, start: 0, duration: 0.15 },
    { freq: 659, start: 0.15, duration: 0.15 },
    { freq: 784, start: 0.3, duration: 0.15 },
    { freq: 1047, start: 0.45, duration: 0.35 },
  ],
  lose: [
    { freq: 392, start: 0, duration: 0.2, type: 'triangle' },
    { freq: 330, start: 0.2, duration: 0.2, type: 'triangle' },
    { freq: 262, start: 0.4, duration: 0.35, type: 'triangle' },
  ],
};

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

// Sintetizado com Web Audio: nenhum arquivo de áudio para carregar. Qualquer
// falha (navegador sem suporte, autoplay bloqueado) vira silêncio.
export function playRiverSound(sound: RiverSound): void {
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    for (const note of SOUNDS[sound]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const peak = note.gain ?? 0.15;
      osc.type = note.type ?? 'sine';
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0.0001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(peak, now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.05);
    }
  } catch {
    // sem som
  }
}
