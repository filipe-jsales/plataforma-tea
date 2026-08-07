import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { MetricsAdminService } from './metrics-admin.service';

// 6.2 — painel institucional do admin. Admin só, sem escopo de titularidade
// (diferente do futuro painel do professor, que trava por
// Classroom.teacherId) — ver docs/ai/backlog/metricas-professor-admin.md.
@Controller('metrics/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MetricsAdminController {
  constructor(private readonly metricsAdminService: MetricsAdminService) {}

  @Get('schools')
  listSchools() {
    return this.metricsAdminService.listSchoolsOverview();
  }

  @Get('schools/:schoolId/classrooms')
  getSchoolClassrooms(@Param('schoolId') schoolId: string) {
    return this.metricsAdminService.getSchoolClassrooms(schoolId);
  }
}
