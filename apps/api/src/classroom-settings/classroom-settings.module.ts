import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SchoolsModule } from '../schools/schools.module';
import { ClassroomSettingsController } from './classroom-settings.controller';
import { ClassroomSettingsService } from './classroom-settings.service';

@Module({
  imports: [SchoolsModule, AuditModule],
  controllers: [ClassroomSettingsController],
  providers: [ClassroomSettingsService],
})
export class ClassroomSettingsModule {}
