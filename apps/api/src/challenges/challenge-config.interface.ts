// Formato esperado de Challenge.config (jsonb livre no banco, tipado aqui só
// no código de aplicação).
//
// ── Nota de pesquisa: aderência ao ciclo Use-Modify-Create (RQ2) ──────────
// O mapeamento sistemático que fundamenta este produto reporta Use-Modify-
// Create em 21,74% dos estudos primários (RQ2) — respaldo empírico para o
// ciclo COMPLETO de 3 etapas, não para "Use" e "Create" isolados. O seed do
// tópico `angulos_formas` (migrations SeedSquareChallengeToolbox,
// SeedUseModifyCreateSequence, SeedModifyChallenge) implementa hoje o ciclo
// COMPLETO:
//   "Monte o quadrado"               → stage 'use'    (position 1)
//   "Monte o quadrado — agora mude!" → stage 'modify' (position 2)
//   "Monte o quadrado — sua vez!"    → stage 'create' (position 3)
// Este é o primeiro tópico com o trio completo — trate-o como referência ao
// desenhar um tópico novo, não como exceção. Ver a tabela de rastreabilidade
// completa (PRIMM × Use-Modify-Create × desafio) em
// docs/ai/modules/backend.md → "Rastreabilidade PRIMM × Use-Modify-Create".
//
// ── Nota de pesquisa: motor PRIMM (RQ2, 4,35% dos estudos) ────────────────
// PRIMM (Predict-Run-Investigate-Modify-Make) é subexplorado na literatura
// mas recomendado teoricamente, e é arquitetura interna do componente de
// desafio, nunca terminologia exposta ao aluno (regra não-negociável 3). Os
// 5 estágios não vivem numa tela só — eles se distribuem ao longo da
// sequência Use→Modify→Create de um tópico, cada um ativado só quando o
// campo de config correspondente está presente (nunca hardcoded por nome de
// desafio/estágio no componente):
//   Predict     → `predictQuestion` presente (hoje nos desafios 'use' e
//                 'modify' — cadência diferente em cada um, ver backend.md)
//   Run         → sempre (todo desafio tem "Executar")
//   Investigate → `investigationQuestion` presente (hoje só no desafio 'use')
//   Modify      → `editableFields` presente (o desafio 'modify' inteiro)
//   Make        → `program` ausente (o desafio 'create' de sempre, editor livre)
// Um desafio novo (de qualquer estágio Use-Modify-Create) adota PRIMM
// simplesmente preenchendo o(s) campo(s) de config relevante(s) — nunca
// escrevendo lógica de tela nova. Ver ChallengePage.tsx (frontend) pra como
// isso vira estado de UI, e docs/ai/modules/{backend,frontend}.md pra mais
// contexto.
//
// Ao adicionar um novo desafio (neste tópico ou em qualquer outro):
//   1. Declare `stage` e `position` explicitamente — nunca deduza a ordem de
//      `createdAt`. `position` é o que permite inserir uma etapa no meio
//      depois sem forjar timestamp (foi assim que o 'modify' entrou aqui).
//   2. Todo blockType novo em `allowedBlockTypes` só pode "estrear" (não ter
//      aparecido em nenhum desafio de `position` menor) num desafio
//      `stage: 'use'` — ver block-progression.ts, testado contra o seed real
//      em block-progression.spec.ts.
//   3. Prefira sempre completar o trio Use→Modify→Create antes de considerar
//      um tópico "pronto" — um tópico com só Use+Create, pulando o Modify, é
//      aceitável como passo incremental, nunca como desenho final.
export type ChallengeStage = 'use' | 'modify' | 'create';

export interface SquareGoalConfig {
  // Ampliado de propósito (4.2 — desafios via template do professor): além
  // do quadrado seed original ('square'), agora também representa qualquer
  // polígono regular gerado pelo template `regular_polygon` (ex.: 'regular_
  // polygon') — a matemática de fechamento (turtleWorld.ts) já era genérica
  // por sides/turnAngleDeg desde sempre, só o literal de tipo estava restrito
  // ao caso seed original.
  shape: string;
  sides: number;
  turnAngleDeg: number;
  // 7.4 (AC3) — tolerância de margem de erro (em pixels) pra considerar que
  // o traçado do aluno "fechou a forma", mitigando imprecisão de
  // coordenação motora fina (RQ4) na montagem/execução dos blocos. Ausente
  // em desafios curados via seed (usa o default de
  // apps/web/src/lib/turtleWorld.ts#CLOSE_TOLERANCE_PX); escolhida pelo
  // professor num desafio criado via template — mesmo racional de
  // `snapTolerancePercent` abaixo, mas um conceito DIFERENTE: aquele é
  // tolerância de encaixe de bloco no editor, este é tolerância de
  // fechamento geométrico do traçado desenhado.
  closureTolerancePx?: number;
}

// 3.7 (AC4) — mensagens de feedback configuráveis pelo professor por
// desafio, com um conjunto de mensagens-padrão sugeridas quando ausente
// (ver DEFAULT_FEEDBACK_MESSAGES em feedback-messages.ts). Só se aplica a
// desafios `stage: 'create'` — `use` nunca avalia sucesso/fracasso (o
// programa vem pronto), e `modify` compõe a própria reflexão dinamicamente
// a partir do resultado da execução, nunca um texto estático (ver
// ChallengePage.tsx).
export interface ChallengeFeedbackMessages {
  retry?: string;
  success?: string;
}

// Um campo numérico do `program` pré-montado que o aluno pode editar na fase
// `modify` (3.4) — a estrutura do programa (quais blocos, como encaixam)
// permanece fixa, só o valor destes campos fica destravado. `min`/`max` são
// os limites "definidos pelo professor" (AC de 3.4): curados via seed/
// migration, o mesmo racional já estabelecido pra "sem autoria de toolbox
// pelo professor nesta versão" (ver "Blocos por desafio" em
// docs/ai/modules/backend.md) — o professor não escreve `min`/`max` numa
// tela, quem cadastra o desafio decide, mas o valor é por-desafio (não fixo
// no bloco), então um `modify` futuro noutro tópico pode usar limites
// diferentes sem tocar na definição do bloco. `blockType`+`fieldName`
// identifica exatamente um campo dentro da árvore de `program` (frontend
// resolve a posição andando a árvore — ver lib/editableFields.ts).
export interface EditableFieldConfig {
  blockType: string;
  fieldName: string;
  label: string;
  min: number;
  max: number;
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

// 3.17 — mesmo domínio de apps/web/src/lib/waterProgram.ts#WaterState,
// duplicado aqui pelo mesmo racional de SerializedBlockState acima.
export type WaterState = 'SOLID' | 'LIQUID' | 'GAS';

// Um ponto de teste do "modelo esperado" (3.17): a temperatura e o estado
// físico cientificamente correto pra ela, segundo o cenário que o
// professor configurou pro desafio (ex.: limiares de fusão/ebulição de
// "dia muito quente"). `apps/api/src/challenges/water-program.ts` roda o
// programa do aluno em CADA `temperatureC` daqui e compara contra
// `expectedState` — nunca visível ao aluno (ver
// ChallengesController.buildDetailOrThrow, que nunca inclui este campo na
// resposta do aluno).
export interface WaterProgramTestCase {
  temperatureC: number;
  expectedState: WaterState;
}

// 3.17 — presente só em desafios `stage: 'create'` do domínio `water_state`
// (hoje curado via migration, mesmo racional de "sem autoria de toolbox
// pelo professor nesta versão" já documentado acima pra `editableFields`/
// `allowedBlockTypes` — um handler de template pro domínio água fica pra
// depois). `scenarioLabel` é só pra exibição no relatório do professor
// (nunca ao aluno).
export interface WaterExpectedModel {
  scenarioLabel: string;
  testCases: WaterProgramTestCase[];
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
  // "Investigate" — ver nota de pesquisa acima). Resposta é só logada
  // (RD-C), nunca corrigida automaticamente — não existe "certo/errado"
  // aqui de propósito, é reflexão guiada, não avaliação.
  investigationQuestion?: string;
  // Pergunta de predição (motor PRIMM "Predict" — ver nota de pesquisa
  // acima). Presente em `stage: 'use'` (só antes da 1ª execução — o
  // programa nunca muda ali) e em `stage: 'modify'` (antes de CADA
  // execução — os valores editáveis mudam a cada rodada); nada impede um
  // `create` futuro de também declarar isso. O frontend só ativa a tela de
  // predição quando este campo existe, nunca por checar `stage`.
  predictQuestion?: string;
  // Presente só em desafios `stage: 'modify'` (motor PRIMM "Modify" — ver
  // nota de pesquisa acima): quais campos do `program` pré-montado ficam
  // destravados pro aluno editar, e dentro de que limites. Frontend
  // renderiza com `readOnly: false`, sem toolbox, blocos não-móveis/não-
  // deletáveis, e só os campos aqui listados aceitando edição.
  editableFields?: EditableFieldConfig[];
  // 4.2 — tolerância de encaixe (0-100%) escolhida pelo professor num
  // desafio criado via template (ver challenge-templates/). Ausente em
  // desafios curados via seed (comportamento default do Blockly, ver
  // apps/web/src/lib/blocklyToolbox.ts#applyGenerousSnapTolerance). Nunca
  // 0 — validado como parâmetro pedagógico inválido pelo handler do
  // template antes de o desafio poder ser salvo (RQ4, coordenação motora
  // fina).
  snapTolerancePercent?: number;
  // Tamanho dos blocos no editor (fator de escala aplicado a
  // `zoom.startScale` do Blockly, ver ChallengePage.tsx) — escolhido pelo
  // professor entre 3 opções nomeadas (Pequeno/Médio/Grande, nunca um número
  // de escala cru, regra não-negociável 9) num desafio criado via template.
  // Ausente em desafios curados via seed (comportamento default do Blockly,
  // `startScale: 1`). Mesmo racional de `snapTolerancePercent` acima —
  // blocos maiores ajudam legibilidade e alvo de toque pra coordenação
  // motora fina (RQ4) — mas é um conceito DIFERENTE: aquele é tolerância de
  // encaixe, este é tamanho visual do bloco.
  blockScale?: number;
  // 3.7 (AC4) — ver ChallengeFeedbackMessages acima.
  feedbackMessages?: ChallengeFeedbackMessages;
  // 3.17 — ver WaterExpectedModel acima. Presente só no desafio 2.3 (`create`,
  // domínio `water_state`); ausente em qualquer outro desafio (geometria
  // inclusa) — `ChallengeValidationService` só valida quando este campo
  // existe, nunca assume um modelo default.
  expectedModel?: WaterExpectedModel;
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
