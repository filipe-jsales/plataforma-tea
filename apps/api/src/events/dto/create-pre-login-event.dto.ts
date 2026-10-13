import { IsIn, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Os ÚNICOS tipos aceitos sem autenticação. Lista fechada de propósito: o
// endpoint é público, então a superfície de abuso é limitada a "gravar um
// destes dois eventos, com payload de forma fixa" - nunca um tipo/payload
// livre vindo do cliente (ver docs/ai/modules/backend.md, "Eventos
// pré-login").
export const PRE_LOGIN_EVENT_TYPES = [
  'login_screen_viewed',
  'sensory_setting_changed_pre_login',
] as const;
export type PreLoginEventType = (typeof PRE_LOGIN_EVENT_TYPES)[number];

export class CreatePreLoginEventDto {
  @IsIn(PRE_LOGIN_EVENT_TYPES)
  type: PreLoginEventType;

  // Forma validada por tipo em EventsService.recordPreLoginEvent (chaves e
  // valores permitidos), não aqui - class-validator não expressa bem
  // "payload depende de `type`".
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  // Id anônimo gerado pelo navegador (aba) só para ligar os eventos da
  // mesma visita - nunca um identificador de aluno.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  sessionId?: string;
}
