import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Role } from '../common/enums/role.enum';
import { SchoolsService } from '../schools/schools.service';

export interface ComparisonSetting {
  classroomId: string;
  enabled: boolean;
}

// 4.3/7.3 — toggle de turma "comparação entre alunos", nasce OFF por
// padrão (regra não-negociável 5). Módulo próprio, pequeno e dedicado
// (mesma granularidade de ChallengeValidationModule) — não é sobre
// matrícula (EnrollmentsModule) nem sobre métrica (MetricsModule), é
// configuração de turma.
@Injectable()
export class ClassroomSettingsService {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly auditService: AuditService,
  ) {}

  // Só professor titular (ou admin) — mesma regra de acesso de
  // MetricsTeacherService.assertOwnClassroom/EnrollmentsService.
  // assertCanManageClassroom, aqui reimplementada porque nenhum dos dois
  // serviços é uma dependência natural deste módulo pequeno.
  async setComparisonEnabled(
    classroomId: string,
    enabled: boolean,
    actor: { id: string; role: Role },
  ): Promise<ComparisonSetting> {
    const classroom = await this.schoolsService.findClassroomById(classroomId);
    if (!classroom) {
      throw new NotFoundException('Turma não encontrada.');
    }
    if (actor.role === Role.TEACHER && classroom.teacherId !== actor.id) {
      throw new ForbiddenException('Você não é o professor titular desta turma.');
    }

    const updated = await this.schoolsService.setClassroomComparisonEnabled(
      classroomId,
      enabled,
    );
    if (!updated) {
      throw new NotFoundException('Turma não encontrada.');
    }

    await this.auditService.recordClassComparisonSettingChange({
      classroomId,
      enabled,
      changedByUserId: actor.id,
      changedByRole: actor.role,
    });

    return { classroomId, enabled: updated.comparisonEnabled };
  }
}
