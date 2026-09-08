import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AdminActionLog } from './entities/admin-action-log.entity';
import { ClassComparisonSettingLog } from './entities/class-comparison-setting-log.entity';
import { ExportAuditLog } from './entities/export-audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExportAuditLog,
      AdminActionLog,
      ClassComparisonSettingLog,
    ]),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
