import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { ExportAuditLog } from './entities/export-audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExportAuditLog])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
