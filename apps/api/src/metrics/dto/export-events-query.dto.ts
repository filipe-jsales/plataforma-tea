import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export type ExportFormat = 'json' | 'csv';

// 6.6 — filtros são todos opcionais aqui (nível de forma/tipo); a regra
// "ao menos um entre escola/desafio/período" é semântica de negócio, não
// validável campo a campo com class-validator — fica em
// MetricsAdminExportService, junto com o limite de 90 dias (mensagem de
// erro precisa nomear QUAIS filtros faltam, não só "DTO inválido").
export class ExportEventsQueryDto {
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  @IsUUID()
  challengeId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['json', 'csv'])
  format?: ExportFormat = 'json';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Máximo 500 — não é "baixar a tabela inteira de uma vez" (AC de 6.6);
  // pra mais dado, o admin pagina (page=2, 3...), cada chamada sujeita ao
  // mesmo rate limit.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 500;
}
