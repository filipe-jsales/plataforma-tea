import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { isFinalPrimmPhase, nextPrimmPhase, PRIMM_PHASES, type PrimmPhase } from '../lib/primmLifecycle';

export interface MiniGameSceneState {
  sceneId: string;
  // MJ1/MJ8 - mesmo assunto curricular do desafio de blocos equivalente
  // (string livre hoje; o vínculo formal de schema entre Challenge/Topic e
  // mini jogo é MJ8, ainda não implementado - ver docs/ai/backlog/
  // mini-jogos-serios.md).
  conceptId: string;
  phase: PrimmPhase;
  // Tentativas na fase ATUAL, zerado a cada `advancePhase` - mesmo
  // racional de granularidade de `attempts` no desafio de blocos
  // (contagem por rodada, não acumulada pra sempre).
  attempts: number;
  status: 'active' | 'completed';
  startedAt: number;
  phaseEnteredAt: number;
}

interface MiniGameState {
  activeScene: MiniGameSceneState | null;
  // MJ1 (AC "uma única cena carregada por vez") - chamar de novo com um
  // `sceneId` diferente troca a cena inteira (o motor de renderização
  // reage a essa mudança desmontando a cena anterior antes de montar a
  // nova, nunca duas simultâneas - ver MiniGameEngine.tsx). Sempre nasce
  // na 1ª fase do PRIMM ('predict').
  startScene: (sceneId: string, conceptId: string) => void;
  recordAttempt: () => void;
  // Avança pra próxima fase PRIMM; na última fase ('make'), marca a cena
  // como concluída em vez de avançar pra uma fase inexistente.
  advancePhase: () => void;
  reset: () => void;
}

export type MiniGameStore = UseBoundStore<StoreApi<MiniGameState>>;

// Factory, não singleton - mesmo racional de createTurtleExecutionStore:
// o componente de renderização (MiniGameEngine) nunca deve importar um
// store global, só reagir ao que recebe via prop, permitindo múltiplas
// instâncias independentes na mesma árvore de componentes se algum dia
// precisar (ex.: preview de mini jogo numa tela de autoria, análoga ao
// `helpStore` do desafio de blocos).
export function createMiniGameStore(): MiniGameStore {
  return create<MiniGameState>((set, get) => ({
    activeScene: null,

    startScene: (sceneId, conceptId) => {
      const now = Date.now();
      set({
        activeScene: {
          sceneId,
          conceptId,
          phase: PRIMM_PHASES[0],
          attempts: 0,
          status: 'active',
          startedAt: now,
          phaseEnteredAt: now,
        },
      });
    },

    recordAttempt: () => {
      const { activeScene } = get();
      if (!activeScene || activeScene.status !== 'active') return;
      set({ activeScene: { ...activeScene, attempts: activeScene.attempts + 1 } });
    },

    advancePhase: () => {
      const { activeScene } = get();
      if (!activeScene || activeScene.status !== 'active') return;
      if (isFinalPrimmPhase(activeScene.phase)) {
        set({ activeScene: { ...activeScene, status: 'completed' } });
        return;
      }
      const next = nextPrimmPhase(activeScene.phase);
      if (!next) return;
      set({
        activeScene: { ...activeScene, phase: next, attempts: 0, phaseEnteredAt: Date.now() },
      });
    },

    reset: () => set({ activeScene: null }),
  }));
}
