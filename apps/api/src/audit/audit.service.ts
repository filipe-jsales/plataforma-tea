import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportAuditLog } from './entities/export-audit-log.entity';

export interface RecordExportParams {
  adminUserId: string;
  filters: Record<string, unknown>;
  rowCount: number;
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
  ) {}

  recordExport(params: RecordExportParams): Promise<ExportAuditLog> {
    const log = this.exportAuditLogRepository.create({
      adminUserId: params.adminUserId,
      filters: params.filters,
      rowCount: params.rowCount,
    });
    return this.exportAuditLogRepository.save(log);
  }
}
