import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from './prefersReducedMotion';

describe('prefersReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when the OS media query matches', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when the OS media query does not match', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

    expect(prefersReducedMotion()).toBe(false);
  });

  it('queries the exact "(prefers-reduced-motion: reduce)" media string', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: false });
    vi.stubGlobal('matchMedia', matchMedia);

    prefersReducedMotion();

    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('never throws when matchMedia is unavailable (defensive default: false)', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(prefersReducedMotion()).toBe(false);
  });
});
