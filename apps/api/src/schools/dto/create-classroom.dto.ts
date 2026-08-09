import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

// Gestão de turmas (admin) — turma como container, dentro de exatamente uma
// escola (schoolId vem da rota, não do corpo). `teacherId` opcional: admin
// pode criar a turma antes de atribuir um professor titular (mesma decisão
// já documentada em Classroom.teacherId).
export class CreateClassroomDto {
  @IsString()
  @Length(2, 120)
  name: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;
}
