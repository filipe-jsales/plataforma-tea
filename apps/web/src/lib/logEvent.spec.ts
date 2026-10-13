import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { logEvent, logLoginScreenViewed, logSensorySettingChangedPreLogin } from './logEvent';

vi.mock('./apiClient', () => ({
  apiClient: { post: vi.fn() },
}));

describe('logEvent', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts the event to /events unchanged', () => {
    vi.mocked(apiClient.post).mockResolvedValue(undefined);

    logEvent({
      studentPseudoId: 'pseudo-1',
      category: 'RD-I',
      type: 'block_snap',
      payload: { blockId: 'b1' },
    });

    expect(apiClient.post).toHaveBeenCalledWith('/events', {
      studentPseudoId: 'pseudo-1',
      category: 'RD-I',
      type: 'block_snap',
      payload: { blockId: 'b1' },
    });
  });

  it('swallows a failed request instead of throwing, only warning to the console', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('network down'));

    expect(() =>
      logEvent({ studentPseudoId: 'pseudo-1', category: 'RD-L', type: 'login_success' }),
    ).not.toThrow();

    await vi.waitFor(() => expect(console.warn).toHaveBeenCalled());
  });

  describe('pre-login events', () => {
    it('posts login_screen_viewed to /events/pre-login with an anonymous session id and no identity', () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      logLoginScreenViewed('student');

      const [path, body] = vi.mocked(apiClient.post).mock.calls[0] as [string, Record<string, unknown>];
      expect(path).toBe('/events/pre-login');
      expect(body).toMatchObject({ type: 'login_screen_viewed', payload: { screen: 'student' } });
      expect(body).not.toHaveProperty('studentPseudoId');
    });

    it('reuses the same anonymous session id across pre-login events of one visit', () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      logLoginScreenViewed('role_select');
      logSensorySettingChangedPreLogin('contrast', true);

      const [first, second] = vi.mocked(apiClient.post).mock.calls.map((call) => call[1] as { sessionId?: string });
      expect(first.sessionId).toBeTruthy();
      expect(second.sessionId).toBe(first.sessionId);
    });

    it('swallows a failed pre-login request', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('network down'));

      expect(() => logLoginScreenViewed('admin')).not.toThrow();
      await vi.waitFor(() => expect(console.warn).toHaveBeenCalled());
    });
  });
});
