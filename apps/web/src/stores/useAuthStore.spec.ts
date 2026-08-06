import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore, type SessionUser } from './useAuthStore';

const buildUser = (overrides: Partial<SessionUser> = {}): SessionUser => ({
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

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
  });

  it('starts with no token and no user', () => {
    const state = useAuthStore.getState();

    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setSession stores both the token and the user together', () => {
    const user = buildUser();

    useAuthStore.getState().setSession('token-abc', user);

    expect(useAuthStore.getState().token).toBe('token-abc');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('updateUser replaces the user without touching the token', () => {
    useAuthStore.getState().setSession('token-abc', buildUser());

    const updated = buildUser({ displayName: 'Nome Atualizado', soundEnabled: true });
    useAuthStore.getState().updateUser(updated);

    expect(useAuthStore.getState().token).toBe('token-abc');
    expect(useAuthStore.getState().user).toEqual(updated);
  });

  it('clearSession wipes both the token and the user', () => {
    useAuthStore.getState().setSession('token-abc', buildUser());

    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
