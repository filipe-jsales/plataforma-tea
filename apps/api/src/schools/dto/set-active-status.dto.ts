import { IsBoolean } from 'class-validator';

// Gestão de escolas/turmas (admin) — desativar/reativar (B1: soft delete via
// deletedAt, nunca hard delete). Compartilhado pelos dois recursos deste
// módulo (mesma forma, mesmo racional) — mesma decisão de UpdateUserStatusDto
// (1.4), aqui num único DTO porque ambos os endpoints vivem no mesmo módulo.
export class SetActiveStatusDto {
  @IsBoolean()
  active: boolean;
}
