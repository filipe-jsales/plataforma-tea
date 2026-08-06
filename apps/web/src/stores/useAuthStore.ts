import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'student' | 'teacher' | 'admin';

export interface SessionUser {
  id: string;
  pseudonymId: string;
  role: Role;
  displayName: string;
  avatar: { label: string; assetRef: string } | null;
  soundEnabled: boolean;
  animationEnabled: boolean;
  sensoryOnboardingCompletedAt: string | null;
}

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  setSession: (token: string, user: SessionUser) => void;
  updateUser: (user: SessionUser) => void;
  clearSession: () => void;
}

// Sessão persistida (localStorage): o aluno pode logar num computador da
// sala e continuar depois sem refazer o fluxo de 3 passos a cada F5. O
// token nunca é armazenado em cookie/servidor — mecanismo simples de
// sessão/JWT, sem OAuth de terceiros (ver docs/ai/persona.md).
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      updateUser: (user) => set({ user }),
      clearSession: () => set({ token: null, user: null }),
    }),
    { name: 'plataforma-tea-session' },
  ),
);
