import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GuidedTourState {
  seenTours: Record<string, boolean>;
  markTourSeen: (key: string) => void;
  hasSeenTour: (key: string) => boolean;
}

// "Já vi esse tutorial" - conveniência de navegador (persistido em
// localStorage), não dado de negócio: não existe (nem faz sentido existir)
// uma coluna equivalente em `User`, diferente do onboarding sensorial do
// aluno, que É rastreado no backend (`User.sensoryOnboardingCompletedAt`,
// ver backend.md) porque ali a UI em si depende do valor (perfil sensorial
// muda o que renderiza). Aqui o único efeito é "não abrir sozinho de novo" -
// um professor que troca de computador só vê o tutorial mais uma vez, sem
// prejuízo nenhum, e sempre pode reabrir manualmente (ver botão "Rever
// tutorial" em TeacherChallengeNew.tsx). `seenTours` é um mapa (não um bool
// solto) porque o mesmo mecanismo serve qualquer tutorial futuro - cada
// chamador escolhe a própria chave (ver GuidedTour.tsx).
export const useGuidedTourStore = create<GuidedTourState>()(
  persist(
    (set, get) => ({
      seenTours: {},
      markTourSeen: (key) => set((state) => ({ seenTours: { ...state.seenTours, [key]: true } })),
      hasSeenTour: (key) => Boolean(get().seenTours[key]),
    }),
    { name: 'plataforma-tea-guided-tours' },
  ),
);
