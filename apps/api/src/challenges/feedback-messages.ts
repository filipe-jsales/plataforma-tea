import type { ChallengeFeedbackMessages } from './challenge-config.interface';

export interface FeedbackMessageValidationError {
  parameterKey: 'retryMessage' | 'successMessage';
  message: string;
}

// 3.7 (AC4) — "conjunto de mensagens-padrão sugeridas caso o professor não
// personalize". São literalmente as mensagens já usadas pelo currículo
// semeado antes desta feature existir (ChallengePage.tsx) — trocar para
// estas constantes não muda nenhum comportamento existente, só as torna
// sobrescrevíveis por desafio.
export const DEFAULT_FEEDBACK_MESSAGES: Required<ChallengeFeedbackMessages> = {
  retry: 'Quase lá — quer tentar de novo?',
  success: 'Você montou o desafio! ✅',
};

const MAX_MESSAGE_LENGTH = 200;

// Regra não-negociável 4, aplicada na ORIGEM (não só na tela): um professor
// não consegue salvar uma mensagem customizada que reintroduza linguagem
// punitiva, mesmo sem querer. Lista pequena e literal (não um filtro de
// linguagem genérico) — o objetivo é pegar o caso óbvio do AC1 ("nunca usa
// as palavras 'errado', 'errou', 'falhou' ou similares"), não policiar tom.
const PUNITIVE_WORDS = ['errad', 'errou', 'falh', 'incorret'];

function containsPunitiveLanguage(text: string): boolean {
  const normalized = text.toLowerCase();
  return PUNITIVE_WORDS.some((word) => normalized.includes(word));
}

// Usado tanto na criação quanto na edição de um desafio via template (ver
// ChallengeTemplatesService) — mesma validação pros dois fluxos, nunca
// duplicada.
export function validateFeedbackMessages(
  messages: ChallengeFeedbackMessages | undefined,
): FeedbackMessageValidationError[] {
  if (!messages) {
    return [];
  }
  const errors: FeedbackMessageValidationError[] = [];
  const entries: Array<['retryMessage' | 'successMessage', string | undefined]> = [
    ['retryMessage', messages.retry],
    ['successMessage', messages.success],
  ];
  for (const [parameterKey, value] of entries) {
    if (!value || !value.trim()) continue;
    if (value.length > MAX_MESSAGE_LENGTH) {
      errors.push({
        parameterKey,
        message: `Essa mensagem passou de ${MAX_MESSAGE_LENGTH} caracteres — deixe-a mais curta.`,
      });
      continue;
    }
    if (containsPunitiveLanguage(value)) {
      errors.push({
        parameterKey,
        message:
          'Essa mensagem não pode usar palavras como "errado"/"errou"/"falhou" — descreva o estado ' +
          'atual e convide o aluno a ajustar (ex.: "esse ângulo ainda não fecha o quadrado — quer ajustar?").',
      });
    }
  }
  return errors;
}

// Aplica trim e descarta campo vazio — nunca persiste string vazia (o
// frontend precisa conseguir distinguir "professor não personalizou" de
// "professor personalizou com texto vazio", pra aplicar o default certo).
// Chamar só depois de `validateFeedbackMessages` não devolver erros.
export function sanitizeFeedbackMessages(
  messages: ChallengeFeedbackMessages | undefined,
): ChallengeFeedbackMessages | undefined {
  if (!messages) {
    return undefined;
  }
  const retry = messages.retry?.trim();
  const success = messages.success?.trim();
  if (!retry && !success) {
    return undefined;
  }
  return {
    ...(retry ? { retry } : {}),
    ...(success ? { success } : {}),
  };
}
