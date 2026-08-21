import { apiClient } from './apiClient';

export type EventCategory = 'RD-I' | 'RD-P' | 'RD-C' | 'RD-E' | 'RD-L';

interface LogEventInput {
  studentPseudoId: string;
  category: EventCategory;
  type: string;
  payload?: Record<string, unknown>;
  challengeId?: string;
  miniGameLevelId?: string;
}

// Wrapper fino sobre POST /events — nunca chamar fetch direto pra eventos,
// pra manter o vocabulário de `type` centralizado e fácil de auditar (ver
// regra não-negociável 6 em docs/ai/rules/coding-rule.md). Falha de log
// nunca deve quebrar a tela — só registra no console.
export function logEvent(input: LogEventInput): void {
  apiClient.post('/events', input).catch((error: unknown) => {
    console.warn('Falha ao registrar evento', input.type, error);
  });
}
