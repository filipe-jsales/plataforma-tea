import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

// Gestão de turmas (admin) — editar nome/reatribuir professor titular.
// `teacherId: null` explícito desvincula o professor (volta ao estado
// "turma sem professor atribuído ainda", já suportado pela entidade) —
// `undefined` (campo omitido) simplesmente não mexe no valor atual.
// `@IsOptional()` sozinho já cobre os dois (ignora os demais validadores do
// campo quando o valor é `null` OU `undefined` — não precisa de
// `@ValidateIf` extra pra distinguir os dois casos aqui).
export class UpdateClassroomDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string | null;
}
