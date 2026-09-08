import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { AdminActionLog } from './entities/admin-action-log.entity';
import { ClassComparisonSettingLog } from './entities/class-comparison-setting-log.entity';
import { ExportAuditLog } from './entities/export-audit-log.entity';

export interface RecordExportParams {
  adminUserId: string;
  filters: Record<string, unknown>;
  rowCount: number;
}

export interface RecordUserActionParams {
  actorUserId: string;
  actorRole: Role;
  actionType: string;
  targetUserId: string;
  targetRole: Role;
  metadata?: Record<string, unknown>;
}

export interface RecordClassComparisonSettingChangeParams {
  classroomId: string;
  enabled: boolean;
  changedByUserId: string;
  changedByRole: Role;
}

// 6.6 — grava a auditoria de exportação. Módulo próprio (não dentro de
// MetricsModule) porque telemetria de staff é uma preocupação transversal
// — qualquer feature futura de admin/professor que precise do mesmo padrão
// ("quem fez o quê, quando") reaproveita este serviço, em vez de cada
// feature inventar a própria tabela.
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(ExportAuditLog)
    private readonly exportAuditLogRepository: Repository<ExportAuditLog>,
    @InjectRepository(AdminActionLog)
    private readonly adminActionLogRepository: Repository<AdminActionLog>,
    @InjectRepository(ClassComparisonSettingLog)
    private readonly classComparisonSettingLogRepository: Repository<ClassComparisonSettingLog>,
  ) {}

  recordExport(params: RecordExportParams): Promise<ExportAuditLog> {
    const log = this.exportAuditLogRepository.create({
      adminUserId: params.adminUserId,
      filters: params.filters,
      rowCount: params.rowCount,
    });
    return this.exportAuditLogRepository.save(log);
  }

  // 1.4 — "toda alteração de papel ou status é auditada (quem, quando, o
  // quê)". Reaproveitado pelo CRUD de usuários do admin para create/edit/
  // activate/deactivate.
  recordUserAction(params: RecordUserActionParams): Promise<AdminActionLog> {
    const log = this.adminActionLogRepository.create({
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      actionType: params.actionType,
      targetUserId: params.targetUserId,
      targetRole: params.targetRole,
      metadata: params.metadata ?? {},
    });
    return this.adminActionLogRepository.save(log);
  }

  // 4.3/7.3 — "quem, quando, ligou/desligou" a comparação entre alunos de
  // uma turma. Ver nota de pesquisa na entidade sobre por que isto não é um
  // evento RD-I em `interaction_events`.
  recordClassComparisonSettingChange(
    params: RecordClassComparisonSettingChangeParams,
  ): Promise<ClassComparisonSettingLog> {
    const log = this.classComparisonSettingLogRepository.create({
      classroomId: params.classroomId,
      enabled: params.enabled,
      changedByUserId: params.changedByUserId,
      changedByRole: params.changedByRole,
    });
    return this.classComparisonSettingLogRepository.save(log);
  }
}
