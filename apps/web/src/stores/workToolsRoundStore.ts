import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { WorkToolsMatchPair } from '../lib/workToolsLevelTypes';

// Estado da rodada ATUAL do jogo "Ferramentas do Mundo do Trabalho" -
// separado do `MiniGameStore` genérico (fase PRIMM/tentativas, comum a
// qualquer mini jogo), mesmo racional de fractionsRoundStore.ts: isto é o
// dado ESPECÍFICO deste jogo (quais pares o aluno já ligou, como
// respondeu cada afirmação). Uma instância por rodada, nunca singleton.
export interface WorkToolsRoundSeed {
  matches?: WorkToolsMatchPair[];
  statementAnswers?: Record<string, boolean>;
}

export interface WorkToolsRoundState {
  matches: WorkToolsMatchPair[];
  statementAnswers: Record<string, boolean>;
  // Reatribuir o mesmo cenário substitui o par anterior (nunca acumula
  // dois pares pro mesmo cenário) - é o que permite ao aluno corrigir sem
  // precisar "desfazer" primeiro.
  setMatch: (scenarioId: string, toolId: string) => void;
  removeMatch: (scenarioId: string) => void;
  answerStatement: (statementId: string, answeredTrue: boolean) => void;
  reset: (seed?: WorkToolsRoundSeed) => void;
}

export type WorkToolsRoundStore = UseBoundStore<StoreApi<WorkToolsRoundState>>;

export function createWorkToolsRoundStore(seed?: WorkToolsRoundSeed): WorkToolsRoundStore {
  return create<WorkToolsRoundState>((set) => ({
    matches: seed?.matches ?? [],
    statementAnswers: seed?.statementAnswers ?? {},

    setMatch: (scenarioId, toolId) =>
      set((state) => ({
        matches: [...state.matches.filter((match) => match.scenarioId !== scenarioId), { scenarioId, toolId }],
      })),

    removeMatch: (scenarioId) =>
      set((state) => ({ matches: state.matches.filter((match) => match.scenarioId !== scenarioId) })),

    answerStatement: (statementId, answeredTrue) =>
      set((state) => ({ statementAnswers: { ...state.statementAnswers, [statementId]: answeredTrue } })),

    reset: (nextSeed) => set({ matches: nextSeed?.matches ?? [], statementAnswers: nextSeed?.statementAnswers ?? {} }),
  }));
}
