import { IsOptional, IsString, Length } from 'class-validator';

// Gestão de escolas (admin) — editar nome/identificador externo. `externalId`
// aceita string vazia como "limpar o campo" (o service normaliza pra null) —
// mais simples que exigir um DTO separado só pra permitir null explícito, e
// consistente com um campo de texto simples na tela.
export class UpdateSchoolDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  externalId?: string;
}
