import { IsOptional, IsString, Length } from 'class-validator';

// Gestão de escolas (admin) — AC: "informo nome e, opcionalmente,
// identificador externo (ex.: código INEP) — sem campos obrigatórios que
// exijam conhecimento técnico".
export class CreateSchoolDto {
  @IsString()
  @Length(2, 150)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  externalId?: string;
}
