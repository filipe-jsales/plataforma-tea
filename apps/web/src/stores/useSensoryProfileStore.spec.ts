import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logSensorySettingChangedPreLogin } from '../lib/logEvent';
import { useAuthStore } from './useAuthStore';
import { useSensoryProfileStore } from './useSensoryProfileStore';

vi.mock('../lib/logEvent', () => ({ logSensorySettingChangedPreLogin: vi.fn() }));

describe('useSensoryProfileStore', () => {
  beforeEach(() => {
    vi.mocked(logSensorySettingChangedPreLogin).mockClear();
    useAuthStore.setState({ token: null, user: null });
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

  describe('sensory_setting_changed_pre_login', () => {
    it('logs each setter when there is no session', () => {
      const store = useSensoryProfileStore.getState();
      store.setMotionEnabled(true);
      store.setSoundEnabled(true);
      store.setHighContrast(true);

      expect(logSensorySettingChangedPreLogin).toHaveBeenNthCalledWith(1, 'motion', true);
      expect(logSensorySettingChangedPreLogin).toHaveBeenNthCalledWith(2, 'sound', true);
      expect(logSensorySettingChangedPreLogin).toHaveBeenNthCalledWith(3, 'contrast', true);
    });

    it('never logs when a session exists (profile hydration and post-login changes are not pre-login)', () => {
      useAuthStore.setState({ token: 'jwt' });

      useSensoryProfileStore.getState().setMotionEnabled(true);

      expect(logSensorySettingChangedPreLogin).not.toHaveBeenCalled();
    });
  });
});
