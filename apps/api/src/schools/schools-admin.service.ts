import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { Classroom } from './entities/classroom.entity';
import { School } from './entities/school.entity';
import { SchoolsService } from './schools.service';

export interface AdminSchoolProfile {
  id: string;
  name: string;
  externalId: string | null;
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface AdminClassroomProfile {
  id: string;
  schoolId: string;
  name: string;
  joinCode: string;
  teacherId: string | null;
  teacherName: string | null;
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

// CRUD administrativo de escolas/turmas — "Como admin, quero cadastrar e
// gerenciar escolas e suas turmas, para que múltiplas escolas operem na
// mesma plataforma de forma isolada." O admin desta plataforma é global
// (vê/gerencia todas as escolas, mesmo desenho já usado por
// MetricsAdminService — ver docs/ai/modules/backend.md), não escopado por
// escola; o isolamento cross-escola que existe de verdade é o do
// professor, naturalmente escopado via `Classroom.teacherId`.
@Injectable()
export class SchoolsAdminService {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly usersService: UsersService,
  ) {}

  async listSchools(): Promise<AdminSchoolProfile[]> {
    const schools = await this.schoolsService.findAllSchoolsIncludingInactive();
    return schools.map((school) => this.toSchoolProfile(school));
  }

  // Usado pela tela de turmas de uma escola específica, pra mostrar o nome
  // no cabeçalho sem obrigar o front a carregar a lista inteira só por
  // isso. `withDeleted` de propósito — a tela de turmas de uma escola
  // desativada ainda precisa abrir (ver createClassroom, que já bloqueia
  // criar turma NOVA numa escola desativada, mas não impede consultar as
  // que já existem).
  async getSchool(id: string): Promise<AdminSchoolProfile> {
    const school =
      await this.schoolsService.findSchoolByIdIncludingInactive(id);
    if (!school) {
      throw new NotFoundException('Escola não encontrada.');
    }
    return this.toSchoolProfile(school);
  }

  async createSchool(dto: {
    name: string;
    externalId?: string;
  }): Promise<AdminSchoolProfile> {
    const school = await this.schoolsService.createSchool({
      name: dto.name.trim(),
      externalId: this.normalizeExternalId(dto.externalId),
    });
    return this.toSchoolProfile(school);
  }

  async updateSchool(
    id: string,
    dto: { name?: string; externalId?: string },
  ): Promise<AdminSchoolProfile> {
    const updated = await this.schoolsService.updateSchool(id, {
      name: dto.name?.trim(),
      externalId:
        dto.externalId === undefined
          ? undefined
          : this.normalizeExternalId(dto.externalId),
    });
    if (!updated) {
      throw new NotFoundException('Escola não encontrada.');
    }
    return this.toSchoolProfile(updated);
  }

  async setSchoolActive(
    id: string,
    active: boolean,
    actorUserId: string,
  ): Promise<AdminSchoolProfile> {
    const updated = await this.schoolsService.setSchoolActive(
      id,
      active,
      actorUserId,
    );
    if (!updated) {
      throw new NotFoundException('Escola não encontrada.');
    }
    return this.toSchoolProfile(updated);
  }

  async listClassrooms(schoolId: string): Promise<AdminClassroomProfile[]> {
    const school =
      await this.schoolsService.findSchoolByIdIncludingInactive(schoolId);
    if (!school) {
      throw new NotFoundException('Escola não encontrada.');
    }
    const classrooms =
      await this.schoolsService.findClassroomsBySchoolIncludingInactive(
        schoolId,
      );
    return classrooms.map((classroom) => this.toClassroomProfile(classroom));
  }

  async createClassroom(
    schoolId: string,
    dto: { name: string; teacherId?: string },
  ): Promise<AdminClassroomProfile> {
    // Turma pertence a exatamente uma escola, e só uma escola ATIVA pode
    // ganhar turma nova (`findSchoolById` já exclui desativada — mesmo
    // filtro automático que qualquer SELECT padrão ganha, ver
    // SoftDeletableEntity).
    const school = await this.schoolsService.findSchoolById(schoolId);
    if (!school) {
      throw new NotFoundException(
        'Escola não encontrada ou desativada — reative-a antes de criar turmas.',
      );
    }
    const teacher = await this.resolveTeacherOrThrow(dto.teacherId);
    const classroom = await this.schoolsService.createClassroom({
      schoolId,
      name: dto.name.trim(),
      teacherId: teacher?.id ?? null,
    });
    return this.toClassroomProfile(classroom, teacher?.displayName ?? null);
  }

  async updateClassroom(
    id: string,
    dto: { name?: string; teacherId?: string | null },
  ): Promise<AdminClassroomProfile> {
    let teacherId: string | null | undefined;
    let teacherName: string | null | undefined;
    if (dto.teacherId === null) {
      teacherId = null;
      teacherName = null;
    } else if (dto.teacherId !== undefined) {
      const teacher = await this.resolveTeacherOrThrow(dto.teacherId);
      teacherId = teacher?.id ?? null;
      teacherName = teacher?.displayName ?? null;
    }
    const updated = await this.schoolsService.updateClassroom(id, {
      name: dto.name?.trim(),
      teacherId,
    });
    if (!updated) {
      throw new NotFoundException('Turma não encontrada.');
    }
    return this.toClassroomProfile(updated, teacherName);
  }

  async setClassroomActive(
    id: string,
    active: boolean,
    actorUserId: string,
  ): Promise<AdminClassroomProfile> {
    const updated = await this.schoolsService.setClassroomActive(
      id,
      active,
      actorUserId,
    );
    if (!updated) {
      throw new NotFoundException('Turma não encontrada.');
    }
    return this.toClassroomProfile(updated);
  }

  // '' vira null (campo "limpo" pelo admin) — nunca persiste string vazia,
  // mesmo racional de sanitizeFeedbackMessages (3.7).
  private normalizeExternalId(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async resolveTeacherOrThrow(
    teacherId: string | undefined,
  ): Promise<User | null> {
    if (teacherId === undefined) {
      return null;
    }
    const teacher = await this.usersService.findById(teacherId);
    if (!teacher || teacher.role !== Role.TEACHER) {
      throw new BadRequestException(
        'teacherId precisa ser um usuário com papel de professor.',
      );
    }
    return teacher;
  }

  private toSchoolProfile(school: School): AdminSchoolProfile {
    return {
      id: school.id,
      name: school.name,
      externalId: school.externalId,
      active: school.deletedAt === null,
      deletedAt: school.deletedAt,
      createdAt: school.createdAt,
    };
  }

  // `teacherName` distingue "não resolvido pelo chamador" (`undefined` —
  // cai pra relation carregada, se houver) de "resolvido como nenhum
  // professor" (`null` explícito — ex.: acabou de ser desvinculado, não
  // existe relation carregada nova pra ler ainda). `??` sozinho trataria os
  // dois casos igual, perdendo essa distinção.
  private toClassroomProfile(
    classroom: Classroom,
    teacherName?: string | null,
  ): AdminClassroomProfile {
    return {
      id: classroom.id,
      schoolId: classroom.schoolId,
      name: classroom.name,
      joinCode: classroom.joinCode,
      teacherId: classroom.teacherId,
      teacherName:
        teacherName !== undefined
          ? teacherName
          : (classroom.teacher?.displayName ?? null),
      active: classroom.deletedAt === null,
      deletedAt: classroom.deletedAt,
      createdAt: classroom.createdAt,
    };
  }
}
