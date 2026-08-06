import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { logEvent } from './logEvent';

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
});
