import type {
  SerializedBlockState,
  WaterProgramTestCase,
  WaterState,
} from './challenge-config.interface';

// 3.17 — porta em TypeScript puro de apps/web/src/lib/waterProgram.ts
// (mesmo algoritmo, mesma forma de árvore `SerializedBlockState`/
// `SerializedBlock`) — DELIBERADAMENTE não "roda o JS gerado pelo Blockly"
// como o texto do card 3.17 sugere: isso exigiria `Blockly.JavaScript.
// workspaceToCode` + `eval`/`new Function` no servidor pra executar código
// gerado a partir de input do aluno — nenhuma superfície de execução
// dinâmica existe hoje em `apps/api` (nem `blockly` está nas dependências
// do backend), e introduzir isso só pra este card seria a primeira
// vulnerabilidade de execução de código arbitrário da plataforma. Um
// tree-walker puro sobre o JSON já serializado é seguro (não executa nada,
// só compara `type`/`fields`), determinístico e mais barato — e é
// exatamente o padrão que o domínio `water_state` já usa no frontend.
const MAX_DEPTH = 100;

function isWaterState(value: unknown): value is WaterState {
  return value === 'SOLID' || value === 'LIQUID' || value === 'GAS';
}

export function interpretWaterProgram(
  topBlock: SerializedBlockState | null | undefined,
  temperatureC: number,
): WaterState | null {
  return evaluateBlock(topBlock ?? undefined, temperatureC, 0);
}

function evaluateBlock(
  block: SerializedBlockState | undefined,
  temperatureC: number,
  depth: number,
): WaterState | null {
  if (!block || depth >= MAX_DEPTH) return null;

  if (block.type === 'conditional_if') {
    const threshold = Number(block.fields?.THRESHOLD ?? 0);
    const branch =
      temperatureC > threshold ? block.inputs?.DO_THEN : block.inputs?.DO_ELSE;
    return evaluateBlock(branch?.block, temperatureC, depth + 1);
  }

  if (block.type === 'set_water_state') {
    const fromRest = evaluateBlock(block.next?.block, temperatureC, depth + 1);
    if (fromRest !== null) return fromRest;
    const state = block.fields?.STATE;
    return isWaterState(state) ? state : null;
  }

  return evaluateBlock(block.next?.block, temperatureC, depth + 1);
}

export interface WaterProgramTestCaseResult {
  temperatureC: number;
  expectedState: WaterState;
  actualState: WaterState | null;
  passed: boolean;
}

export interface WaterProgramValidationResult {
  caseResults: WaterProgramTestCaseResult[];
  correctCount: number;
  totalCount: number;
  allPassed: boolean;
}

// 3.17 (AC1) — roda o programa do aluno contra CADA caso de teste do
// "modelo esperado" (limiares configurados pelo professor) e compara a
// saída — pura, sem I/O, sem eval; `topBlock` é a mesma árvore já recebida
// no `block_sequence_json` do evento `program_executed` (RD-P), nada novo
// é pedido ao aluno.
export function validateWaterProgramAgainstTestCases(
  topBlock: SerializedBlockState | null | undefined,
  testCases: WaterProgramTestCase[],
): WaterProgramValidationResult {
  const caseResults = testCases.map((testCase) => {
    const actualState = interpretWaterProgram(topBlock, testCase.temperatureC);
    return {
      temperatureC: testCase.temperatureC,
      expectedState: testCase.expectedState,
      actualState,
      passed: actualState === testCase.expectedState,
    };
  });
  const correctCount = caseResults.filter((result) => result.passed).length;
  return {
    caseResults,
    correctCount,
    totalCount: caseResults.length,
    allPassed: caseResults.length > 0 && correctCount === caseResults.length,
  };
}
