import { beforeEach, describe, expect, it } from 'vitest';
import { isFontScale, useReadingPrefsStore } from './useReadingPrefsStore';

describe('useReadingPrefsStore (F15/F16)', () => {
  beforeEach(() => {
    localStorage.clear();
    useReadingPrefsStore.setState({ fontScale: 'normal', readAloudEnabled: false });
    document.documentElement.removeAttribute('data-font-scale');
  });

  it('defaults to normal text and no voice (regra não-negociável 1)', () => {
    const state = useReadingPrefsStore.getState();

    expect(state.fontScale).toBe('normal');
    expect(state.readAloudEnabled).toBe(false);
  });

  it('setFontScale updates state and mirrors it onto the document dataset', () => {
    useReadingPrefsStore.getState().setFontScale('xlarge');

    expect(useReadingPrefsStore.getState().fontScale).toBe('xlarge');
    expect(document.documentElement.dataset.fontScale).toBe('xlarge');
  });

  it('setFontScale back to normal restores the default dataset value', () => {
    useReadingPrefsStore.getState().setFontScale('large');
    useReadingPrefsStore.getState().setFontScale('normal');

    expect(document.documentElement.dataset.fontScale).toBe('normal');
  });

  it('setReadAloudEnabled only flips the flag, never the text size', () => {
    useReadingPrefsStore.getState().setReadAloudEnabled(true);

    expect(useReadingPrefsStore.getState().readAloudEnabled).toBe(true);
    expect(useReadingPrefsStore.getState().fontScale).toBe('normal');
  });

  it('persists both choices on this device, so they survive a reload', () => {
    useReadingPrefsStore.getState().setFontScale('large');
    useReadingPrefsStore.getState().setReadAloudEnabled(true);

    const saved = JSON.parse(localStorage.getItem('plataforma-tea-reading-prefs') ?? '{}');
    expect(saved.state).toEqual({ fontScale: 'large', readAloudEnabled: true });
  });

  it('ignores a corrupted/unknown saved value instead of applying it', async () => {
    localStorage.setItem(
      'plataforma-tea-reading-prefs',
      JSON.stringify({ state: { fontScale: 'gigantic', readAloudEnabled: 'yes' }, version: 0 }),
    );

    await useReadingPrefsStore.persist.rehydrate();

    expect(useReadingPrefsStore.getState().fontScale).toBe('normal');
    expect(useReadingPrefsStore.getState().readAloudEnabled).toBe(false);
  });

  it('isFontScale accepts only the three known sizes', () => {
    expect(['normal', 'large', 'xlarge'].every(isFontScale)).toBe(true);
    expect(isFontScale('huge')).toBe(false);
    expect(isFontScale(undefined)).toBe(false);
  });
});
