import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventCategory } from '../common/enums/event-category.enum';
import { IllustrationKind } from '../common/enums/illustration-kind.enum';
import { Role } from '../common/enums/role.enum';
import { EventsService } from '../events/events.service';
import { GuardianConsentsService } from '../guardian-consents/guardian-consents.service';
import { IllustrationsService } from '../illustrations/illustrations.service';
import { SchoolsService } from '../schools/schools.service';
import { UsersService } from '../users/users.service';
import { CreateStudentAccountDto } from './dto/create-student-account.dto';
import { RegisterGuardianConsentDto } from './dto/register-guardian-consent.dto';

export interface PendingStudentAccount {
  student: { id: string; displayName: string; pseudonymId: string };
  classroom: { id: string; name: string; joinCode: string };
  avatar: { label: string; assetRef: string };
  // AC: "tentativa de cadastro duplicado... gera alerta não bloqueante,
  // não erro fatal" — a conta é criada de qualquer forma; o frontend decide
  // como exibir o aviso.
  duplicateWarning: boolean;
}

export interface StudentAccountCredential {
  student: { id: string; displayName: string; pseudonymId: string };
  classroom: { id: string; name: string; joinCode: string };
  credential: {
    avatar: { label: string; assetRef: string };
    loginImages: { label: string; assetRef: string }[];
  };
}

// 1.2/A2 — Criação de conta de aluno feita pela escola/professor (não
// autoatendimento), em DOIS passos reais desde A2: (1) `createPending` cria
// a conta matriculada, com avatar, mas sem credencial utilizável; (2)
// `registerGuardianConsent` registra o consentimento do responsável legal
// (ECA) e só então ativa a credencial (avatar + sequência de imagens,
// reaproveitando o mesmo mecanismo de login de 1.1 — ver
// AuthService.loginStudent). Nenhuma credencial existe antes do passo 2 —
// `active: false` até lá (ver UsersService.createPendingStudent).
@Injectable()
export class StudentAccountsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly schoolsService: SchoolsService,
    private readonly illustrationsService: IllustrationsService,
    private readonly eventsService: EventsService,
    private readonly guardianConsentsService: GuardianConsentsService,
  ) {}

  // Passo 1 (A2, AC1) — a etapa de responsável legal é obrigatória DEPOIS
  // desta chamada, antes de qualquer credencial existir (ver
  // registerGuardianConsent/activateCredential abaixo). Matrícula já
  // acontece aqui — só a CREDENCIAL de acesso é que fica pendente, nunca o
  // vínculo aluno↔turma.
  async createPending(
    dto: CreateStudentAccountDto,
    actor: { id: string; role: Role },
  ): Promise<PendingStudentAccount> {
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

    const student = await this.usersService.createPendingStudent({
      displayName,
      avatarId: avatar.id,
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
      avatar: { label: avatar.label, assetRef: avatar.assetRef },
      duplicateWarning,
    };
  }

  // Passo 2 (A2, AC2) — registra o consentimento (nome, vínculo, contato do
  // responsável + aceite explícito, com timestamp e quem registrou) e SÓ
  // DEPOIS libera a credencial — reaproveita activateCredential (mesmo
  // método que o endpoint de nova tentativa usa), nunca duas
  // implementações divergentes do que significa "ativar".
  async registerGuardianConsent(
    studentId: string,
    dto: RegisterGuardianConsentDto,
    actor: { id: string; role: Role },
  ): Promise<StudentAccountCredential> {
    const student = await this.usersService.findById(studentId);
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Aluno não encontrado.');
    }
    // "Aceite explícito de termo" (AC2) — checagem de VALOR, não só de
    // tipo (o DTO já garante boolean); mesma separação schema/regra
    // pedagógica já usada na validação de template de desafio.
    if (!dto.consentAccepted) {
      throw new BadRequestException(
        'É necessário confirmar o consentimento do responsável legal para continuar.',
      );
    }
    const existing =
      await this.guardianConsentsService.findByStudentId(studentId);
    if (existing) {
      throw new ConflictException(
        'O consentimento do responsável legal já foi registrado para este aluno.',
      );
    }

    await this.guardianConsentsService.recordConsent({
      studentId,
      guardianName: dto.guardianName.trim(),
      guardianRelationship: dto.guardianRelationship.trim(),
      guardianContact: dto.guardianContact.trim(),
      consentedAt: new Date(),
      collectedByUserId: actor.id,
    });

    return this.activateCredential(studentId);
  }

  // Passo 3 (A2, AC3) — ativa a credencial (gera a sequência de login +
  // `active: true`). Bloqueia com mensagem clara quando o consentimento
  // ainda não existe ("qual etapa está pendente", AC3) — reaproveitado
  // tanto pelo fluxo feliz (chamado de dentro de registerGuardianConsent)
  // quanto por um endpoint próprio de nova tentativa
  // (`POST .../activate-credential`), pro caso de a ativação em si falhar
  // depois do consentimento já ter sido gravado.
  async activateCredential(
    studentId: string,
  ): Promise<StudentAccountCredential> {
    const student = await this.usersService.findById(studentId);
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Aluno não encontrado.');
    }
    if (student.active) {
      // Nunca regenerar uma credencial já ativa — invalidaria em silêncio
      // uma sequência de login já impressa/entregue ao aluno.
      throw new ConflictException('A credencial deste aluno já está ativa.');
    }
    const hasConsent = await this.guardianConsentsService.hasConsent(
      studentId,
    );
    if (!hasConsent) {
      throw new BadRequestException(
        'Consentimento do responsável legal pendente — registre-o antes de ativar a credencial do aluno.',
      );
    }
    if (!student.avatar) {
      throw new BadRequestException('Aluno sem avatar definido.');
    }

    const enrollment =
      await this.schoolsService.findSingleActiveEnrollment(studentId);
    if (!enrollment) {
      throw new NotFoundException('Aluno sem matrícula ativa.');
    }
    const classroom = await this.schoolsService.findClassroomById(
      enrollment.classroomId,
    );
    if (!classroom) {
      throw new NotFoundException('Turma não encontrada.');
    }

    const loginImages =
      await this.illustrationsService.pickRandomLoginImageSequence();
    await this.usersService.activateStudentCredential(
      studentId,
      loginImages.map((image) => image.id),
    );

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
        avatar: {
          label: student.avatar.label,
          assetRef: student.avatar.assetRef,
        },
        loginImages: loginImages.map((image) => ({
          label: image.label,
          assetRef: image.assetRef,
        })),
      },
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
