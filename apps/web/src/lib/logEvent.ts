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

// Wrapper fino sobre POST /events - nunca chamar fetch direto pra eventos,
// pra manter o vocabulário de `type` centralizado e fácil de auditar (ver
// regra não-negociável 6 em docs/ai/rules/coding-rule.md). Falha de log
// nunca deve quebrar a tela - só registra no console.
export function logEvent(input: LogEventInput): void {
  apiClient.post('/events', input).catch((error: unknown) => {
    console.warn('Falha ao registrar evento', input.type, error);
  });
}

export type LoginScreen = 'role_select' | 'student' | 'teacher' | 'admin';
export type PreLoginSensorySetting = 'motion' | 'sound' | 'contrast';

// Id anônimo da visita (por aba), só pra ligar os eventos pré-login entre
// si - nunca um identificador de aluno. Se sessionStorage estiver
// indisponível (modo privado, bloqueio), o evento segue sem `sessionId`.
function preLoginSessionId(): string | undefined {
  try {
    const key = 'plataforma-tea-prelogin-session';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

// Eventos ANTES do login (sem JWT/pseudônimo): POST /events/pre-login, lista
// fechada de 2 tipos no backend. Mesma regra de `logEvent`: falha nunca
// quebra a tela. Só chamar quando não há sessão (ver
// useSensoryProfileStore pra o gate de `sensory_setting_changed_pre_login`).
function logPreLoginEvent(type: string, payload: Record<string, unknown>): void {
  apiClient.post('/events/pre-login', { type, payload, sessionId: preLoginSessionId() }).catch((error: unknown) => {
    console.warn('Falha ao registrar evento pré-login', type, error);
  });
}

export function logLoginScreenViewed(screen: LoginScreen): void {
  logPreLoginEvent('login_screen_viewed', { screen });
}

export function logSensorySettingChangedPreLogin(setting: PreLoginSensorySetting, value: boolean): void {
  logPreLoginEvent('sensory_setting_changed_pre_login', { setting, value });
}
