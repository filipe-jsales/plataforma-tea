import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventCategory } from '../common/enums/event-category.enum';
import { IllustrationKind } from '../common/enums/illustration-kind.enum';
import { Role } from '../common/enums/role.enum';
import { EventsService } from '../events/events.service';
import { IllustrationsService } from '../illustrations/illustrations.service';
import { SchoolsService } from '../schools/schools.service';
import { UsersService } from '../users/users.service';
import { CreateStudentAccountDto } from './dto/create-student-account.dto';

export interface StudentAccountCredential {
  student: { id: string; displayName: string; pseudonymId: string };
  classroom: { id: string; name: string; joinCode: string };
  credential: {
    avatar: { label: string; assetRef: string };
    loginImages: { label: string; assetRef: string }[];
  };
  // AC: "tentativa de cadastro duplicado... gera alerta não bloqueante,
  // não erro fatal" — a conta é criada de qualquer forma; o frontend decide
  // como exibir o aviso.
  duplicateWarning: boolean;
}

// 1.2 — Criação de conta de aluno feita pela escola/professor (não
// autoatendimento). O aluno nunca passa por um fluxo de cadastro
// tradicional: professor/admin informa nome + turma, o sistema gera a
// credencial (avatar + sequência de imagens, reaproveitando o mesmo
// mecanismo de login já implementado em 1.1 — ver AuthService.loginStudent)
// e devolve uma tela imprimível pro professor entregar ao aluno.
@Injectable()
export class StudentAccountsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly schoolsService: SchoolsService,
    private readonly illustrationsService: IllustrationsService,
    private readonly eventsService: EventsService,
  ) {}

  async create(
    dto: CreateStudentAccountDto,
    actor: { id: string; role: Role },
  ): Promise<StudentAccountCredential> {
    const classroom = await this.schoolsService.findClassroomById(
      dto.classroomId,
    );
    if (!classroom) {
      throw new NotFoundException('Turma não encontrada.');
    }
    // AC: "professor sem papel de admin só pode cadastrar alunos nas
    // turmas as quais está vinculado" — admin não tem essa restrição.
    if (actor.role === Role.TEACHER && classroom.teacherId !== actor.id) {
      throw new ForbiddenException(
        'Você não é o professor titular desta turma.',
      );
    }

    const displayName = dto.displayName.trim();
    const duplicateWarning =
      await this.schoolsService.hasActiveStudentWithNameInClassroom(
        dto.classroomId,
        displayName,
      );

    const avatar = await this.resolveAvatar(dto.avatarId);
    const loginImages =
      await this.illustrationsService.pickRandomLoginImageSequence();

    // AC: "nome do aluno em texto livre nunca é usado como parte da
    // credencial" — a credencial vem inteiramente do catálogo de
    // ilustrações, nunca de `displayName`.
    const student = await this.usersService.createStudent({
      displayName,
      avatarId: avatar.id,
      loginImageSequence: loginImages.map((image) => image.id),
    });

    await this.schoolsService.createEnrollment(student.id, dto.classroomId);

    await this.eventsService.record({
      studentPseudoId: student.pseudonymId,
      category: EventCategory.INTERACTION,
      type: 'student_account_created',
      payload: { created_by_role: actor.role, class_id: dto.classroomId },
    });

    return {
      student: {
        id: student.id,
        displayName: student.displayName,
        pseudonymId: student.pseudonymId,
      },
      classroom: {
        id: classroom.id,
        name: classroom.name,
        joinCode: classroom.joinCode,
      },
      credential: {
        avatar: { label: avatar.label, assetRef: avatar.assetRef },
        loginImages: loginImages.map((image) => ({
          label: image.label,
          assetRef: image.assetRef,
        })),
      },
      duplicateWarning,
    };
  }

  private async resolveAvatar(avatarId?: string) {
    if (!avatarId) {
      return this.illustrationsService.pickRandomAvatar();
    }
    const avatars = await this.illustrationsService.findByKind(
      IllustrationKind.AVATAR,
    );
    const chosen = avatars.find((avatar) => avatar.id === avatarId);
    if (!chosen) {
      throw new BadRequestException('Avatar inválido.');
    }
    return chosen;
  }
}
