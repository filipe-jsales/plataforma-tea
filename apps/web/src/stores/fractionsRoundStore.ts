import { create, type StoreApi, type UseBoundStore } from 'zustand';

// Estado da rodada ATUAL do jogo "Fábrica de Pedaços Iguais" - separado do
// `MiniGameStore` genérico (que só guarda a fase PRIMM/tentativas, comum a
// qualquer mini jogo) porque este é o dado ESPECÍFICO do conteúdo deste
// jogo (quantas partes o corte gerou, quantas foram entregues). A cena Pixi
// (fractionsFactoryScene.ts) assina esta store pra redesenhar o objeto -
// mesmo racional de factory de `createMiniGameStore`/
// `createTurtleExecutionStore`: uma instância por rodada, nunca singleton.
export interface FractionsRoundState {
  totalParts: number | null;
  deliveredParts: number | null;
  // Redesenha a cena com o resultado da simulação mais recente (chamado
  // depois de "Executar" - ver FractionsGamePage). `executed: false` no
  // início da rodada mostra o inteiro intacto, ainda sem cortes.
  executed: boolean;
  setResult: (totalParts: number | null, deliveredParts: number | null) => void;
  reset: () => void;
}

export type FractionsRoundStore = UseBoundStore<StoreApi<FractionsRoundState>>;

export function createFractionsRoundStore(): FractionsRoundStore {
  return create<FractionsRoundState>((set) => ({
    totalParts: null,
    deliveredParts: null,
    executed: false,
    setResult: (totalParts, deliveredParts) =>
      set({ totalParts, deliveredParts, executed: true }),
    reset: () => set({ totalParts: null, deliveredParts: null, executed: false }),
  }));
}
