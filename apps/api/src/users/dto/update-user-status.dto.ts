import { IsBoolean } from 'class-validator';

// 1.4 — AC: "desativar um usuário bloqueia login imediatamente".
export class UpdateUserStatusDto {
  @IsBoolean()
  active: boolean;
}
