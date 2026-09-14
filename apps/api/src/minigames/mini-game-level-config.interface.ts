// Formato de MiniGameLevel.config (jsonb livre no banco, tipado aqui só no
// código de aplicação) — mesmo racional de challenge-config.interface.ts,
// mas pro domínio "Fábrica de Pedaços Iguais" (1º mini jogo de conteúdo,
// ver docs/ai/backlog/mini-jogo-fabrica-pedacos-iguais.md).
//
// Diferente do desafio de blocos, NADA aqui precisa ficar oculto do aluno
// (não existe `expectedModel`/gabarito escondido): o pedido (fração-alvo) e
// a sequência pré-montada dos níveis Use/Modify são sempre visíveis — é
// literalmente o que o aluno vê na tela. O backend só guarda e serve
// `config` inteiro, a validação de acerto roda no cliente
// (apps/web/src/lib/fractionsFactory.ts), mesmo racional de
// turtleWorld.ts (fechamento geométrico calculado no frontend).
export type MiniGameStage = 'use' | 'modify' | 'create';

// MJ9 — chave pequena e fechada identificando QUAL jogo uma linha de
// `mini_game_levels` pertence (mesmo racional de `Topic.domain`). É o
// único acoplamento entre a linha de catálogo (dado) e o validador de
// config correspondente (ver validators/validator-registry.ts) — cadastrar
// um jogo novo é 1 valor novo aqui + 1 validador + 1 entrada no registry,
// nenhum outro arquivo do módulo muda.
export type MiniGameKey = 'fractions_factory' | 'work_tools_match';

export type FractionsFactoryTheme = 'chocolate_bar' | 'pizza' | 'garden';

// 5 cartões fixos da paleta (RQ4 — sobrecarga cognitiva, 39,13%: paleta
// pequena e nunca ampliada por este jogo). `repeat_cut` é deliberadamente
// SEM efeito matemático (ver nota de decisão em
// docs/ai/backlog/mini-jogo-fabrica-pedacos-iguais.md — "Repetir corte é
// pedagógico, não matemático"): reforça a percepção de iteração/repetição
// sem amarrar o denominador a potências de 2.
export type FractionsFactoryCard =
  | { type: 'choose_whole' }
  | { type: 'cut_equal_parts'; parts: number }
  | { type: 'repeat_cut' }
  | { type: 'separate_pieces'; count: number }
  | { type: 'deliver_order' };

export interface FractionsFactoryFraction {
  numerator: number;
  denominator: number;
}

export interface FractionsFactoryLevelConfig {
  theme: FractionsFactoryTheme;
  // Pedido (fração-alvo) mostrado ao aluno. Presente em todo nível — em
  // 'create', é o pedido da PRIMEIRA rodada; rodadas seguintes ("Novo
  // pedido", fase Make do PRIMM) sorteiam de `fractionPool`.
  targetFraction: FractionsFactoryFraction;
  // Presente só em 'use' (sequência correta, travada) e 'modify' (sequência
  // quase certa, com 1 cartão errado/fora de ordem) — ausente em 'create'
  // (aluno monta do zero).
  presetSequence?: FractionsFactoryCard[];
  // Presente só em 'create' — pool de frações-alvo configurável pelo
  // professor de onde "Novo pedido" sorteia (nunca a plataforma inteira de
  // denominadores 2-8, só o que o professor escolheu ensinar).
  fractionPool?: FractionsFactoryFraction[];
}

const THEMES: FractionsFactoryTheme[] = ['chocolate_bar', 'pizza', 'garden'];
const MIN_DENOMINATOR = 2;
const MAX_DENOMINATOR = 8;

export function isValidFraction(value: unknown): value is FractionsFactoryFraction {
  if (!value || typeof value !== 'object') return false;
  const fraction = value as Partial<FractionsFactoryFraction>;
  return (
    Number.isInteger(fraction.denominator) &&
    Number.isInteger(fraction.numerator) &&
    (fraction.denominator as number) >= MIN_DENOMINATOR &&
    (fraction.denominator as number) <= MAX_DENOMINATOR &&
    (fraction.numerator as number) >= 1 &&
    (fraction.numerator as number) < (fraction.denominator as number)
  );
}

export function isValidTheme(value: unknown): value is FractionsFactoryTheme {
  return typeof value === 'string' && THEMES.includes(value as FractionsFactoryTheme);
}

export function isFractionsFactoryLevelConfig(value: unknown): value is FractionsFactoryLevelConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<FractionsFactoryLevelConfig>;
  return isValidTheme(config.theme) && isValidFraction(config.targetFraction);
}

// MJ10 — 2º jogo de CONTEÚDO ("Ferramentas do Mundo do Trabalho", BNCC
// EM13CO09 — ver docs/ai/backlog/mini-jogo-ferramentas-mundo-trabalho.md),
// categoria Educação em Computação (CC1) — ensina sobre tecnologia, não uma
// disciplina da educação básica. Mesmo racional de nada-oculto das frações:
// `correctMatches`/`isTrue` são sempre visíveis no `config` servido ao
// aluno, a validação de acerto roda no cliente
// (apps/web/src/lib/workToolsMatch.ts).
export interface WorkToolsScenario {
  id: string;
  label: string;
  // Emoji — mesmo "sistema de ícone" do resto da plataforma. Deliberadamente
  // DIFERENTE do ícone da ferramenta correta (nunca emojis idênticos entre
  // um cenário e seu par certo): a tarefa é ler e raciocinar sobre o
  // contexto, não "achar o emoji igual".
  icon: string;
}

export interface WorkToolsTool {
  id: string;
  label: string;
  icon: string;
}

export interface WorkToolsMatchPair {
  scenarioId: string;
  toolId: string;
}

export interface WorkToolsStatement {
  id: string;
  text: string;
  isTrue: boolean;
  // Texto de apoio mostrado junto do feedback (regra não-negociável 4:
  // nunca só "certo"/"errado") — explica o PORQUÊ da resposta, nunca "você
  // errou".
  explanation: string;
}

export interface WorkToolsLevelConfig {
  scenarios: WorkToolsScenario[];
  // Pode ter mais entradas que cenários visíveis (distratores) — ver
  // `RegularPolygonTemplateHandler`-like racional de nunca esconder o
  // catálogo completo de opções do aluno.
  tools: WorkToolsTool[];
  // Gabarito completo — cobre TODO cenário que possa aparecer (inclusive
  // os de `scenarioPool`), nunca só os da rodada inicial.
  correctMatches: WorkToolsMatchPair[];
  statements: WorkToolsStatement[];
  // Presente só em 'use' (todos os pares corretos, travado) e 'modify'
  // (1 par e/ou 1 resposta errados de propósito, pra o aluno corrigir) —
  // ausente em 'create' (aluno liga do zero).
  presetMatches?: WorkToolsMatchPair[];
  presetStatementAnswers?: Record<string, boolean>;
  // Presente só em 'create' — pool de cenários extras de onde "Novo
  // cenário" sorteia a próxima rodada (mesmo racional de `fractionPool`).
  scenarioPool?: WorkToolsScenario[];
}

export function isWorkToolsLevelConfig(value: unknown): value is WorkToolsLevelConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<WorkToolsLevelConfig>;
  return (
    Array.isArray(config.scenarios) &&
    Array.isArray(config.tools) &&
    Array.isArray(config.correctMatches) &&
    Array.isArray(config.statements)
  );
}
