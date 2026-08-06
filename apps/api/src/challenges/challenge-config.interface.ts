// Formato esperado de Challenge.config (jsonb livre no banco, tipado aqui só
// no código de aplicação).
//
// ── Nota de pesquisa: aderência ao ciclo Use-Modify-Create (RQ2) ──────────
// O mapeamento sistemático que fundamenta este produto reporta Use-Modify-
// Create em 21,74% dos estudos primários (RQ2) — respaldo empírico para o
// ciclo COMPLETO de 3 etapas, não para "Use" e "Create" isolados. O estado
// atual do seed (ver migrations SeedSquareChallengeToolbox e
// SeedSecondSquareChallenge) implementa:
//   Desafio 1 "Monte o quadrado"        → stage 'use'    (position 1)
//   Desafio 2 "Monte o quadrado — sua vez!" → stage 'create' (position 2)
// Isso é um ESTADO INTERMEDIÁRIO, não a sequência desenhada. Falta a etapa
// 'modify' entre as duas (ex.: o mesmo programa do Desafio 1, mas editável —
// mudar o número de lados/ângulo pra virar triângulo/pentágono), que é o que
// conecta pedagogicamente "só observar" a "criar do zero". Não tratar essa
// sequência de 2 desafios como validada/completa para fins de pesquisa com
// usuários reais ou de qualquer alegação de aderência ao framework
// Use-Modify-Create até o desafio 'modify' existir.
//
// Ao adicionar um novo desafio (neste tópico ou em qualquer outro):
//   1. Declare `stage` e `position` explicitamente — nunca deduza a ordem de
//      `createdAt`. `position` é o que permite inserir uma etapa no meio
//      depois (ex.: o 'modify' que falta) sem forjar timestamp.
//   2. Todo blockType novo em `allowedBlockTypes` só pode "estrear" (não ter
//      aparecido em nenhum desafio de `position` menor) num desafio
//      `stage: 'use'` — ver block-progression.ts, testado contra o seed real
//      em block-progression.spec.ts.
//   3. Prefira sempre completar o trio Use→Modify→Create antes de considerar
//      um tópico "pronto" — um tópico com só Use+Create (como este, hoje) é
//      aceitável como passo incremental, nunca como desenho final.
export type ChallengeStage = 'use' | 'modify' | 'create';

export interface SquareGoalConfig {
  shape: 'square';
  sides: number;
  turnAngleDeg: number;
}

// Mesmo formato que Blockly.serialization.blocks.save()/.load() (ver
// apps/web/src/lib/blockProgram.ts, que consome exatamente esta forma) —
// duplicado aqui de propósito: não há pacote compartilhado entre as duas
// apps neste monorepo (mesmo padrão dos outros DTOs backend/frontend).
export interface SerializedBlockState {
  type: string;
  fields?: Record<string, string | number>;
  inputs?: Record<string, { block?: SerializedBlockState }>;
  next?: { block?: SerializedBlockState };
}

export interface ChallengeConfig {
  stage: ChallengeStage;
  allowedBlockTypes: string[];
  goal: SquareGoalConfig;
  // Presente só em desafios `stage: 'use'` (fase "observe antes de montar",
  // 3.3): o workspace nasce com este programa já montado, travado pra
  // edição (ChallengePage renderiza com `readOnly: true` e sem toolbox) —
  // único controle do aluno é Executar/Repetir execução.
  program?: SerializedBlockState;
  // Pergunta de investigação exibida após a 1ª execução (motor PRIMM
  // "Investigate", ainda não modelado como estrutura própria — ver
  // Challenge entity). Resposta é só logada (RD-C), nunca corrigida
  // automaticamente — não existe "certo/errado" aqui de propósito, é
  // reflexão guiada, não avaliação.
  investigationQuestion?: string;
}

export function isChallengeConfig(value: unknown): value is ChallengeConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const config = value as Partial<ChallengeConfig>;
  return (
    typeof config.stage === 'string' &&
    Array.isArray(config.allowedBlockTypes) &&
    config.allowedBlockTypes.every((type) => typeof type === 'string') &&
    typeof config.goal === 'object' &&
    config.goal !== null
  );
}
