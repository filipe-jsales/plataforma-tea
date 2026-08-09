import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventCategory } from '../common/enums/event-category.enum';
import { Role } from '../common/enums/role.enum';
import { EventsService } from '../events/events.service';
import { Classroom } from '../schools/entities/classroom.entity';
import { SchoolsService } from '../schools/schools.service';
import { UsersService } from '../users/users.service';

export interface TransferResult {
  studentId: string;
  previousClassroomId: string | null;
  newClassroom: { id: string; name: string; joinCode: string };
}

export interface ClassroomRosterEntry {
  id: string;
  displayName: string;
  avatar: { label: string; assetRef: string } | null;
  enrolledAt: Date;
}

// 1.5 — Vínculo aluno ↔ turma ↔ professor. `Enrollment` (histórico
// active/unenrolledAt, ver database.md) já existia antes desta feature —
// isto é a primeira camada de escrita/API sobre ela (antes só lida por
// 4.3, ver "Endpoints CRUD para schools/classrooms/enrollments" em
// docs/ai/modules/backend.md).
@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
  ) {}

  // AC1 — 1ª matrícula (sem vínculo anterior) e AC2 — transferência (encerra
  // o vínculo anterior, cria um novo) são o MESMO fluxo: só existe "vínculo
  // anterior" ou não. AC5 (nunca duas turmas ativas simultaneamente) é
  // garantido por construção — sempre encerramos o anterior antes de criar
  // o novo, nunca acumulamos.
  async transfer(
    studentId: string,
    classroomId: string,
    actor: { id: string; role: Role },
  ): Promise<TransferResult> {
    const student = await this.usersService.findById(studentId);
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    const destination =
      await this.schoolsService.findClassroomById(classroomId);
    if (!destination) {
      throw new NotFoundException('Turma não encontrada.');
    }
    this.assertCanManageClassroom(destination, actor);

    const previous =
      await this.schoolsService.findSingleActiveEnrollment(studentId);
    if (previous) {
      if (previous.classroomId === classroomId) {
        throw new ConflictException('Aluno já está matriculado nesta turma.');
      }
      const previousClassroom = await this.schoolsService.findClassroomById(
        previous.classroomId,
      );
      if (previousClassroom) {
        this.assertCanManageClassroom(previousClassroom, actor);
      }
      await this.schoolsService.endEnrollment(previous);
    }

    await this.schoolsService.createEnrollment(studentId, classroomId);

    await this.eventsService.record({
      studentPseudoId: student.pseudonymId,
      category: EventCategory.LONGITUDINAL,
      type: 'class_enrollment_changed',
      payload: {
        previous_class_id: previous?.classroomId ?? null,
        new_class_id: classroomId,
      },
    });

    return {
      studentId,
      previousClassroomId: previous?.classroomId ?? null,
      newClassroom: {
        id: destination.id,
        name: destination.name,
        joinCode: destination.joinCode,
      },
    };
  }

  async listRoster(
    classroomId: string,
    actor: { id: string; role: Role },
  ): Promise<ClassroomRosterEntry[]> {
    const classroom = await this.schoolsService.findClassroomById(classroomId);
    if (!classroom) {
      throw new NotFoundException('Turma não encontrada.');
    }
    this.assertCanManageClassroom(classroom, actor);

    const enrollments =
      await this.schoolsService.findActiveStudentsInClassroom(classroomId);
    return enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      displayName: enrollment.student.displayName,
      avatar: enrollment.student.avatar
        ? {
            label: enrollment.student.avatar.label,
            assetRef: enrollment.student.avatar.assetRef,
          }
        : null,
      enrolledAt: enrollment.enrolledAt,
    }));
  }

  // "Professor sem papel de admin só pode... turmas as quais está
  // vinculado" (1.2), mesma regra aplicada aqui pros dois lados da
  // transferência — admin não tem essa restrição.
  private assertCanManageClassroom(
    classroom: Classroom,
    actor: { id: string; role: Role },
  ): void {
    if (actor.role === Role.TEACHER && classroom.teacherId !== actor.id) {
      throw new ForbiddenException(
        'Você não é o professor titular desta turma.',
      );
    }
  }
}
