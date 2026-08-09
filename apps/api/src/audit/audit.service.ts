import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { AdminActionLog } from './entities/admin-action-log.entity';
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
}
