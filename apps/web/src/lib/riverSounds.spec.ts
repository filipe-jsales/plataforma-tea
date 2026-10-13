import { afterEach, describe, expect, it, vi } from 'vitest';
import { playRiverSound } from './riverSounds';

describe('playRiverSound', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('não quebra quando o navegador não tem Web Audio', () => {
    expect(() => playRiverSound('win')).not.toThrow();
  });

  it('não quebra quando o áudio lança erro', () => {
    vi.stubGlobal('AudioContext', function () {
      throw new Error('bloqueado');
    });
    expect(() => playRiverSound('conflict')).not.toThrow();
  });
});
