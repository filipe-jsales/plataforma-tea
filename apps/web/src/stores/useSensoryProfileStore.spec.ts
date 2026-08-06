import { beforeEach, describe, expect, it } from 'vitest';
import { useSensoryProfileStore } from './useSensoryProfileStore';

describe('useSensoryProfileStore', () => {
  beforeEach(() => {
    useSensoryProfileStore.setState({
      motionEnabled: false,
      soundEnabled: false,
      highContrast: false,
    });
  });

  it('defaults every sensory toggle to off (regra não-negociável 1)', () => {
    const state = useSensoryProfileStore.getState();

    expect(state.motionEnabled).toBe(false);
    expect(state.soundEnabled).toBe(false);
    expect(state.highContrast).toBe(false);
  });

  it('setMotionEnabled updates state and mirrors it onto the document dataset', () => {
    useSensoryProfileStore.getState().setMotionEnabled(true);

    expect(useSensoryProfileStore.getState().motionEnabled).toBe(true);
    expect(document.documentElement.dataset.motion).toBe('full');
  });

  it('setSoundEnabled updates state and the document dataset independently', () => {
    useSensoryProfileStore.getState().setSoundEnabled(true);

    expect(useSensoryProfileStore.getState().soundEnabled).toBe(true);
    expect(document.documentElement.dataset.sound).toBe('on');
    expect(document.documentElement.dataset.motion).toBe('reduced');
  });

  it('setHighContrast updates state and the document dataset', () => {
    useSensoryProfileStore.getState().setHighContrast(true);

    expect(useSensoryProfileStore.getState().highContrast).toBe(true);
    expect(document.documentElement.dataset.contrast).toBe('high');
  });
});
