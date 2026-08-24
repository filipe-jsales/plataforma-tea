// 7.5 — perguntas PRIMM (Predição/Investigação) configuráveis pelo
// professor num desafio criado via template. Mesmo padrão de
// feedback-messages.ts (validação pura + sanitização, reaproveitada tanto
// na criação quanto na edição via ChallengeTemplatesService), mas com uma
// diferença deliberada: aqui as duas perguntas são OBRIGATÓRIAS (AC1 do
// 7.5 — "validação bloqueante na publicação"), não opcionais como
// feedbackMessages. Como não existe estado de rascunho no fluxo de
// template (ChallengeTemplatesService: "Salvar" já É "Publicar"), o
// choke-point de validação de `createChallenge`/`updateMine` é literalmente
// a validação de publicação que o AC pede.

export interface PrimmQuestionsInput {
  predictQuestion?: string;
  investigationQuestion?: string;
}

export interface PrimmQuestionValidationError {
  parameterKey: 'predictQuestion' | 'investigationQuestion';
  message: string;
}

// AC4 do 7.5 — "nenhum limite de caracteres excessivamente curto": ao
// contrário de feedback-messages.ts (MAX_MESSAGE_LENGTH = 200, mensagem
// curta de tela), uma pergunta de reflexão pode ser mais longa — o teto
// aqui é só uma defesa contra abuso de payload, nunca uma restrição
// pedagógica de verdade.
const MAX_QUESTION_LENGTH = 500;

export function validatePrimmQuestions(input: PrimmQuestionsInput | undefined): PrimmQuestionValidationError[] {
  const errors: PrimmQuestionValidationError[] = [];
  const entries: Array<['predictQuestion' | 'investigationQuestion', string | undefined]> = [
    ['predictQuestion', input?.predictQuestion],
    ['investigationQuestion', input?.investigationQuestion],
  ];
  const LABEL: Record<'predictQuestion' | 'investigationQuestion', string> = {
    predictQuestion: 'de Predição',
    investigationQuestion: 'de Investigação',
  };
  for (const [parameterKey, value] of entries) {
    if (!value || !value.trim()) {
      errors.push({
        parameterKey,
        message: `Escreva a pergunta ${LABEL[parameterKey]} antes de salvar — ela é obrigatória pra o motor PRIMM guiar a reflexão do aluno.`,
      });
      continue;
    }
    if (value.length > MAX_QUESTION_LENGTH) {
      errors.push({
        parameterKey,
        message: `Essa pergunta passou de ${MAX_QUESTION_LENGTH} caracteres — deixe-a mais curta.`,
      });
    }
  }
  return errors;
}

// Chamar só depois de `validatePrimmQuestions` não devolver erros — nesse
// ponto as duas sempre existem e cabem no limite, então o resultado nunca
// é `null` na prática (o tipo de retorno é estrito, não opcional, ao
// contrário de `sanitizeFeedbackMessages`, refletindo que aqui é sempre
// obrigatório).
export function sanitizePrimmQuestions(input: PrimmQuestionsInput): {
  predictQuestion: string;
  investigationQuestion: string;
} {
  return {
    predictQuestion: (input.predictQuestion ?? '').trim(),
    investigationQuestion: (input.investigationQuestion ?? '').trim(),
  };
}

export interface PrimmQuestionSuggestion {
  predictQuestion: string;
  investigationQuestion: string;
}

// AC2 do 7.5 — "sugestões pré-escritas por tipo de desafio (ex.:
// geometria)". Chave é `ChallengeTemplate.key` (não `Topic.domain`, que
// descreve o motor de renderização, não o assunto pedagógico — ver
// docs/ai/modules/backend.md) — o mesmo identificador que
// `handlers/template-registry.ts` já usa pra despachar o handler de cada
// template, então cadastrar um template novo cadastra sua sugestão no
// mesmo lugar, sem precisar de uma segunda tabela/coluna. Fallback
// genérico cobre um template futuro sem entrada aqui ainda — nunca undefined.
const PRIMM_QUESTION_SUGGESTIONS: Record<string, PrimmQuestionSuggestion> = {
  regular_polygon: {
    predictQuestion: 'Quantos lados você acha que essa figura vai ter quando o programa rodar?',
    investigationQuestion: 'O que você percebeu sobre o ângulo de giro entre um lado e o próximo?',
  },
};

const DEFAULT_PRIMM_QUESTION_SUGGESTION: PrimmQuestionSuggestion = {
  predictQuestion: 'O que você acha que vai acontecer quando executar esse programa?',
  investigationQuestion: 'O que você percebeu depois de rodar o programa?',
};

export function getPrimmQuestionSuggestion(templateKey: string): PrimmQuestionSuggestion {
  return PRIMM_QUESTION_SUGGESTIONS[templateKey] ?? DEFAULT_PRIMM_QUESTION_SUGGESTION;
}
