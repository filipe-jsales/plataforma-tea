import { apiClient } from './apiClient';
import { useAuthStore, type SessionUser } from '../stores/useAuthStore';
import { useSensoryProfileStore } from '../stores/useSensoryProfileStore';

interface LoginResponse {
  accessToken: string;
  role: SessionUser['role'];
  displayName: string;
}

// POST /auth/*/login só devolve { accessToken, role, displayName } - o
// resto do perfil (avatar, prefs sensoriais, etc.) vem de GET /users/me,
// que só pode ser chamado depois do token existir. Centralizado aqui pra
// não repetir essa sequência nos 3 fluxos de login.
export async function completeLogin(login: () => Promise<LoginResponse>): Promise<SessionUser> {
  const { accessToken, role, displayName } = await login();

  // Necessário setar a sessão (mesmo que incompleta) antes de chamar
  // /users/me, porque o apiClient lê o token do useAuthStore.
  useAuthStore.getState().setSession(accessToken, {
    id: '',
    pseudonymId: '',
    role,
    displayName,
    avatar: null,
    soundEnabled: false,
    animationEnabled: false,
    sensoryOnboardingCompletedAt: null,
  });

  const profile = await apiClient.get<SessionUser>('/users/me');
  useAuthStore.getState().updateUser(profile);

  if (profile.role === 'student') {
    useSensoryProfileStore.getState().setMotionEnabled(profile.animationEnabled);
    useSensoryProfileStore.getState().setSoundEnabled(profile.soundEnabled);
  }

  return profile;
}
