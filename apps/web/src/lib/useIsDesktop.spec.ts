import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_MEDIA_QUERY, useIsDesktop } from './useIsDesktop';

type Listener = () => void;

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<Listener>();
  const query = {
    get matches() {
      return matches;
    },
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
  };
  const matchMedia = vi.fn().mockReturnValue(query);
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    matchMedia,
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useIsDesktop', () => {
  it('uses the 1024px breakpoint', () => {
    expect(DESKTOP_MEDIA_QUERY).toBe('(min-width: 1024px)');
  });

  it('reflects the current match and reacts when the viewport crosses the breakpoint', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
    expect(media.matchMedia).toHaveBeenCalledWith(DESKTOP_MEDIA_QUERY);

    act(() => media.setMatches(true));
    expect(result.current).toBe(true);

    act(() => media.setMatches(false));
    expect(result.current).toBe(false);
  });

  it('falls back to false (drawer mode) when matchMedia is not available', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });
});
