import { IsString, IsUUID, MinLength } from 'class-validator';

// 1.4 — consumo do link de definição de senha gerado na criação de
// professor/admin pelo admin (ver AuthService.setPassword).
export class SetPasswordDto {
  @IsUUID()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}
