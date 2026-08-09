import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AdminActionLog } from './entities/admin-action-log.entity';
import { ExportAuditLog } from './entities/export-audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExportAuditLog, AdminActionLog])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
