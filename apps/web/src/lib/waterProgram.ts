import type { SerializedBlock } from './blockProgram';

export type { SerializedBlock };

export type WaterState = 'SOLID' | 'LIQUID' | 'GAS';

// Profundidade máxima de recursão — trava simples contra um programa
// mal-formado com ciclo (nunca deveria acontecer: o workspace é sempre
// travado nesta trilha, mas é defesa em profundidade, mesmo racional de
// MAX_ACTIONS em blockProgram.ts).
const MAX_DEPTH = 100;

function isWaterState(value: unknown): value is WaterState {
  return value === 'SOLID' || value === 'LIQUID' || value === 'GAS';
}

// Intérprete do domínio "Estados da Matéria" (3.13/3.14): ao contrário de
// blockProgram.ts (turtle, achata tudo numa lista sequencial e sempre
// executa cada bloco), aqui existe RAMIFICAÇÃO real — um `conditional_if`
// só percorre UM dos dois ramos (DO_THEN ou DO_ELSE), nunca os dois. Se o
// caminho percorrido passar por mais de um `set_water_state` em sequência
// (via `next`), o ÚLTIMO alcançado decide o resultado — o programa "decide
// um estado final", não uma lista de ações a animar. Percorre
// `inputs`/`next` genericamente (mesma forma de SerializedBlock), então um
// `conditional_if` aninhado dentro de um ramo funciona sem caso especial,
// mesmo que o currículo seedado hoje use só 1 nível.
export function interpretWaterProgram(
  topBlock: SerializedBlock | null | undefined,
  temperatureC: number,
): WaterState | null {
  return evaluateBlock(topBlock ?? undefined, temperatureC, 0);
}

function evaluateBlock(
  block: SerializedBlock | undefined,
  temperatureC: number,
  depth: number,
): WaterState | null {
  if (!block || depth >= MAX_DEPTH) return null;

  if (block.type === 'conditional_if') {
    const threshold = Number(block.fields?.THRESHOLD ?? 0);
    const branch = temperatureC > threshold ? block.inputs?.DO_THEN : block.inputs?.DO_ELSE;
    return evaluateBlock(branch?.block, temperatureC, depth + 1);
  }

  if (block.type === 'set_water_state') {
    const fromRest = evaluateBlock(block.next?.block, temperatureC, depth + 1);
    if (fromRest !== null) return fromRest;
    const state = block.fields?.STATE;
    return isWaterState(state) ? state : null;
  }

  // Tipo de bloco desconhecido pra este domínio — ignorado, mesmo racional
  // do `default` em blockProgram.ts#interpretBlock.
  return evaluateBlock(block.next?.block, temperatureC, depth + 1);
}
