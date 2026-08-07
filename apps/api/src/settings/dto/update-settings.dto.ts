import { IsInt, Min } from 'class-validator';

export class UpdateSettingsDto {
  // AC de 6.5: "qualquer inteiro positivo" — 0 não faz sentido (todo
  // desafio com N=0 já é tratado como "sem dados" antes de qualquer
  // comparação de threshold).
  @IsInt()
  @Min(1)
  minSampleSizeThreshold: number;
}
