import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// F15/F16 - preferências de leitura do aluno. Ao contrário de
// `useSensoryProfileStore` (cuja fonte da verdade é o backend, por aluno),
// estas ficam só no aparelho: são conveniência de leitura de quem está
// naquele computador, não dado de negócio nem de pesquisa. Os dois valores
// nascem no mais neutro (texto normal, sem voz) - regra não-negociável 1.
export type FontScale = 'normal' | 'large' | 'xlarge';

export const FONT_SCALE_OPTIONS: ReadonlyArray<{ value: FontScale; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Grande' },
  { value: 'xlarge', label: 'Muito grande' },
];

export function isFontScale(value: unknown): value is FontScale {
  return FONT_SCALE_OPTIONS.some((option) => option.value === value);
}

interface ReadingPrefs {
  fontScale: FontScale;
  // Só habilita o botão "Ouvir" nos desafios. Nunca fala sozinho.
  readAloudEnabled: boolean;
}

interface ReadingPrefsState extends ReadingPrefs {
  setFontScale: (value: FontScale) => void;
  setReadAloudEnabled: (value: boolean) => void;
}

function applyToDocument(prefs: ReadingPrefs) {
  document.documentElement.dataset.fontScale = prefs.fontScale;
}

export const useReadingPrefsStore = create<ReadingPrefsState>()(
  persist(
    (set, get) => ({
      fontScale: 'normal',
      readAloudEnabled: false,

      setFontScale: (value) => {
        set({ fontScale: value });
        applyToDocument(get());
      },
      setReadAloudEnabled: (value) => {
        set({ readAloudEnabled: value });
      },
    }),
    {
      name: 'plataforma-tea-reading-prefs',
      partialize: ({ fontScale, readAloudEnabled }) => ({ fontScale, readAloudEnabled }),
      // Valor salvo por uma versão futura/corrompido nunca vira estado: cai
      // no padrão neutro.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<ReadingPrefs>;
        return {
          ...current,
          fontScale: isFontScale(saved.fontScale) ? saved.fontScale : current.fontScale,
          readAloudEnabled: saved.readAloudEnabled === true,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) applyToDocument(state);
      },
    },
  ),
);

// Sincroniza o <html> com o estado inicial assim que o módulo carrega.
applyToDocument(useReadingPrefsStore.getState());
