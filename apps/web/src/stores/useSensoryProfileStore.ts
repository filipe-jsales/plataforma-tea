import { create } from 'zustand';

// Perfil sensorial do aluno: estado global observável por qualquer componente
// (editor de blocos, mundo PixiJS, feedback de desafio), lido antes de decidir
// tocar som, animar algo ou mudar contraste. Ver regra não-negociável 1.
export interface SensoryProfile {
  // Desligado por padrão (RQ4: 30,43% dos estudos reportam hipersensibilidade
  // sensorial como barreira). Só liga se o aluno/professor ativar explicitamente.
  motionEnabled: boolean;
  soundEnabled: boolean;
  highContrast: boolean;
}

interface SensoryProfileState extends SensoryProfile {
  setMotionEnabled: (value: boolean) => void;
  setSoundEnabled: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
}

function applyToDocument(profile: SensoryProfile) {
  const root = document.documentElement;
  root.dataset.motion = profile.motionEnabled ? 'full' : 'reduced';
  root.dataset.contrast = profile.highContrast ? 'high' : 'standard';
  root.dataset.sound = profile.soundEnabled ? 'on' : 'off';
}

export const useSensoryProfileStore = create<SensoryProfileState>((set, get) => ({
  motionEnabled: false,
  soundEnabled: false,
  highContrast: false,

  setMotionEnabled: (value) => {
    set({ motionEnabled: value });
    applyToDocument(get());
  },
  setSoundEnabled: (value) => {
    set({ soundEnabled: value });
    applyToDocument(get());
  },
  setHighContrast: (value) => {
    set({ highContrast: value });
    applyToDocument(get());
  },
}));

// Sincroniza o <html> com o estado inicial assim que o módulo carrega.
applyToDocument(useSensoryProfileStore.getState());
