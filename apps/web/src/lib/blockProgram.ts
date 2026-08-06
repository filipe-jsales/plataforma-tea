// Formato de bloco serializado igual ao de Blockly.serialization.blocks.save()
// (só o subconjunto que os 3 blocos da paleta MVP usam: encadeamento via
// `next`, bloco de estatuto aninhado via `inputs.DO`). ChallengePage.tsx
// serializa o workspace real nesse formato antes de chamar interpretProgram —
// manter esse tipo separado de Blockly permite testar a interpretação sem
// precisar de um workspace de verdade (sem DOM/jsdom).
export interface SerializedBlock {
  type: string;
  fields?: Record<string, string | number>;
  inputs?: Record<string, { block?: SerializedBlock }>;
  next?: { block?: SerializedBlock };
}

export type TurtleAction = { kind: 'move' } | { kind: 'turn'; direction: 'LEFT' | 'RIGHT' };

// Máximo de repetições somadas — trava simples contra um "repetir 999999
// vezes" travar a animação/thread; generoso o bastante pra qualquer desafio
// MVP (nenhum precisa de mais que algumas dezenas de passos).
const MAX_ACTIONS = 500;

// Achata a árvore de blocos (incluindo blocos de "repetir" aninhados) numa
// lista sequencial de ações — é essa lista que turtleWorld.ts executa.
// Bloco de tipo desconhecido é ignorado (nunca deveria acontecer: a toolbox
// só oferece os blocos do catálogo do desafio), não é erro fatal do aluno.
export function interpretProgram(topBlock: SerializedBlock | null | undefined): TurtleAction[] {
  const actions: TurtleAction[] = [];
  let block: SerializedBlock | undefined = topBlock ?? undefined;

  while (block && actions.length < MAX_ACTIONS) {
    actions.push(...interpretBlock(block));
    block = block.next?.block;
  }

  return actions.slice(0, MAX_ACTIONS);
}

function interpretBlock(block: SerializedBlock): TurtleAction[] {
  switch (block.type) {
    case 'move_forward':
      return [{ kind: 'move' }];
    case 'turn': {
      const direction = block.fields?.DIR === 'LEFT' ? 'LEFT' : 'RIGHT';
      return [{ kind: 'turn', direction }];
    }
    case 'repeat_times': {
      const times = Math.max(0, Number(block.fields?.TIMES ?? 0));
      const body = interpretProgram(block.inputs?.DO?.block);
      return Array.from({ length: times }, () => body).flat();
    }
    default:
      return [];
  }
}
