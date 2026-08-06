import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { completeLogin } from './authFlow';
import { useAuthStore, type SessionUser } from '../stores/useAuthStore';
import { useSensoryProfileStore } from '../stores/useSensoryProfileStore';

vi.mock('./apiClient', () => ({
  apiClient: { get: vi.fn() },
}));

const buildProfile = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: 'user-1',
  pseudonymId: 'pseudo-1',
  role: 'student',
  displayName: 'Aluno Um',
  avatar: null,
  soundEnabled: false,
  animationEnabled: false,
  sensoryOnboardingCompletedAt: null,
  ...overrides,
});

describe('completeLogin', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
    useSensoryProfileStore.setState({
      motionEnabled: false,
      soundEnabled: false,
      highContrast: false,
    });
    vi.mocked(apiClient.get).mockReset();
  });

  it('sets the session from the login response, then hydrates it from /users/me', async () => {
    const login = vi.fn().mockResolvedValue({
      accessToken: 'token-abc',
      role: 'student',
      displayName: 'Aluno Um',
    });
    const profile = buildProfile({ soundEnabled: true, animationEnabled: true });
    vi.mocked(apiClient.get).mockResolvedValue(profile);

    const result = await completeLogin(login);

    expect(useAuthStore.getState().token).toBe('token-abc');
    expect(useAuthStore.getState().user).toEqual(profile);
    expect(apiClient.get).toHaveBeenCalledWith('/users/me');
    expect(result).toEqual(profile);
  });

  it('syncs the sensory profile store from the fetched profile for a student', async () => {
    const login = vi.fn().mockResolvedValue({
      accessToken: 'token-abc',
      role: 'student',
      displayName: 'Aluno Um',
    });
    vi.mocked(apiClient.get).mockResolvedValue(
      buildProfile({ soundEnabled: true, animationEnabled: true }),
    );

    await completeLogin(login);

    expect(useSensoryProfileStore.getState().soundEnabled).toBe(true);
    expect(useSensoryProfileStore.getState().motionEnabled).toBe(true);
  });

  it('does not touch the sensory profile store for a teacher or admin login', async () => {
    const login = vi.fn().mockResolvedValue({
      accessToken: 'token-abc',
      role: 'teacher',
      displayName: 'Professor Um',
    });
    vi.mocked(apiClient.get).mockResolvedValue(
      buildProfile({ role: 'teacher', soundEnabled: true, animationEnabled: true }),
    );

    await completeLogin(login);

    expect(useSensoryProfileStore.getState().soundEnabled).toBe(false);
    expect(useSensoryProfileStore.getState().motionEnabled).toBe(false);
  });
});
