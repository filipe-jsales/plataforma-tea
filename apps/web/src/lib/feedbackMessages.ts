// 3.7 (AC4) — mesmo conjunto de mensagens-padrão sugeridas que o backend
// devolveria por default (ver apps/api/src/challenges/feedback-messages.ts,
// DEFAULT_FEEDBACK_MESSAGES) — duplicado aqui de propósito (mesmo padrão de
// ChallengeConfig/SerializedBlockState, não há pacote compartilhado entre
// as duas apps neste monorepo). São literalmente as mensagens já usadas
// pelo currículo semeado antes desta feature existir.
export const DEFAULT_RETRY_MESSAGE = 'Quase lá — quer tentar de novo?';
export const DEFAULT_SUCCESS_MESSAGE = 'Você montou o desafio! ✅';

export interface ChallengeFeedbackMessages {
  retry: string | null;
  success: string | null;
}

export function resolveRetryMessage(messages: ChallengeFeedbackMessages | null): string {
  return messages?.retry ?? DEFAULT_RETRY_MESSAGE;
}

export function resolveSuccessMessage(messages: ChallengeFeedbackMessages | null): string {
  return messages?.success ?? DEFAULT_SUCCESS_MESSAGE;
}
