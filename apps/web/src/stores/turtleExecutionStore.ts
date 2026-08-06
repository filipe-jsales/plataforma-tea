import { create, type UseBoundStore, type StoreApi } from 'zustand';
import type { Point } from '../lib/turtleWorld';

export type ExecutionStatus = 'idle' | 'stepping' | 'playing';

export interface TurtleExecutionState {
  points: Point[];
  animate: boolean;
  status: ExecutionStatus;
  // Quantos pontos já "revelados" quando animate=false (regra 3.2 AC2:
  // padrão sem animação é avanço por passos controlados pelo aluno, não um
  // desenho instantâneo). Em animate=true isto é ignorado — PixiTurtleWorld
  // anima a sequência inteira sozinho.
  stepIndex: number;
  runToken: number;
  play: (points: Point[], animate: boolean) => void;
  advanceStep: () => void;
  reset: () => void;
}

export type TurtleExecutionStore = UseBoundStore<StoreApi<TurtleExecutionState>>;

// Factory, não um store singleton: 3.2 AC1 exige que o componente de
// renderização (PixiTurtleWorld) nunca importe/manipule o DOM ou a instância
// do Blockly diretamente — só o estado deste store. ChallengePage cria uma
// instância própria por "mundo" que precisa existir na tela (a execução do
// aluno e, na fase Create, o preview de Ajuda são dois mundos independentes
// — ver ChallengePage.tsx) via `useMemo(() => createTurtleExecutionStore(), [])`.
export function createTurtleExecutionStore(): TurtleExecutionStore {
  return create<TurtleExecutionState>((set, get) => ({
    points: [],
    animate: false,
    status: 'idle',
    stepIndex: 0,
    runToken: 0,
    play: (points, animate) =>
      set((state) => ({
        points,
        animate,
        // Programa sem nenhum movimento (0/1 ponto) não tem passo pra
        // avançar — nasce 'idle' direto, nunca 'stepping', pra não mostrar
        // "Próximo passo" sem nada pra fazer.
        status: animate ? 'playing' : points.length > 1 ? 'stepping' : 'idle',
        stepIndex: 0,
        runToken: state.runToken + 1,
      })),
    advanceStep: () => {
      const { points, stepIndex } = get();
      const lastIndex = Math.max(points.length - 1, 0);
      const nextIndex = Math.min(stepIndex + 1, lastIndex);
      set({ stepIndex: nextIndex, status: nextIndex >= lastIndex ? 'idle' : 'stepping' });
    },
    reset: () => set({ points: [], status: 'idle', stepIndex: 0 }),
  }));
}
