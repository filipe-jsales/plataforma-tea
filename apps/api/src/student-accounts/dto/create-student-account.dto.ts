import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

// 1.2 — AC: "vejo um formulário com apenas: nome do aluno, turma... e
// seleção/geração de avatar". Sem e-mail/senha/telefone de propósito — não
// existe campo nenhum aqui pra isso (nunca "opcional e vazio").
export class CreateStudentAccountDto {
  @IsString()
  @Length(1, 120)
  displayName: string;

  @IsUUID()
  classroomId: string;

  // Quando ausente, o backend sorteia um avatar do catálogo (AC: "seleção/
  // geração de avatar" — os dois caminhos são válidos).
  @IsOptional()
  @IsUUID()
  avatarId?: string;
}
