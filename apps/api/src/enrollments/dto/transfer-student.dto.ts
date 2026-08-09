import { IsUUID } from 'class-validator';

// 1.5 — matricular (1ª vez) ou transferir (já matriculado em outra turma)
// um aluno. Mesmo endpoint cobre os dois casos — ver EnrollmentsService.
export class TransferStudentDto {
  @IsUUID()
  classroomId: string;
}
