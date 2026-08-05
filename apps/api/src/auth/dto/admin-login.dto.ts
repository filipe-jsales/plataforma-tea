import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  // Código TOTP de 6 dígitos do segundo fator.
  @IsString()
  @Length(6, 6)
  otp: string;
}
