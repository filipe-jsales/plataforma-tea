import { create } from 'zustand';
import { logSensorySettingChangedPreLogin, type PreLoginSensorySetting } from '../lib/logEvent';
import { useAuthStore } from './useAuthStore';

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

// `sensory_setting_changed_pre_login` (RD-I): só quando a mudança acontece
// SEM sessão (antes do login). Com sessão, o perfil já é persistido pelo
// PATCH /users/:id/sensory-profile e a hidratação de main.tsx (que também
// passa por estes setters) nunca deve virar evento.
function logIfPreLogin(setting: PreLoginSensorySetting, value: boolean) {
  if (!useAuthStore.getState().token) {
    logSensorySettingChangedPreLogin(setting, value);
  }
}

export const useSensoryProfileStore = create<SensoryProfileState>((set, get) => ({
  motionEnabled: false,
  soundEnabled: false,
  highContrast: false,

  setMotionEnabled: (value) => {
    set({ motionEnabled: value });
    applyToDocument(get());
    logIfPreLogin('motion', value);
  },
  setSoundEnabled: (value) => {
    set({ soundEnabled: value });
    applyToDocument(get());
    logIfPreLogin('sound', value);
  },
  setHighContrast: (value) => {
    set({ highContrast: value });
    applyToDocument(get());
    logIfPreLogin('contrast', value);
  },
}));

// Sincroniza o <html> com o estado inicial assim que o módulo carrega.
applyToDocument(useSensoryProfileStore.getState());
