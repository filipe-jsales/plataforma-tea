import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { MetricsAdminChallengeService } from './metrics-admin-challenge.service';
import { MetricsAdminService } from './metrics-admin.service';

// 6.2/6.5 — painel institucional + relatório de profundidade por desafio do
// admin. Admin só, sem escopo de titularidade (diferente do painel do
// professor, que trava por Classroom.teacherId) — ver
// docs/ai/backlog/metricas-professor-admin.md.
@Controller('metrics/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MetricsAdminController {
  constructor(
    private readonly metricsAdminService: MetricsAdminService,
    private readonly metricsAdminChallengeService: MetricsAdminChallengeService,
  ) {}

  @Get('schools')
  listSchools() {
    return this.metricsAdminService.listSchoolsOverview();
  }

  @Get('schools/:schoolId/classrooms')
  getSchoolClassrooms(@Param('schoolId') schoolId: string) {
    return this.metricsAdminService.getSchoolClassrooms(schoolId);
  }

  // 6.5 — seletor de desafio (todo desafio cadastrado, qualquer tópico).
  @Get('challenges')
  listChallenges() {
    return this.metricsAdminChallengeService.listChallenges();
  }

  // 6.5 — relatório de profundidade completo de um desafio específico.
  @Get('challenges/:challengeId')
  getChallengeReport(@Param('challengeId') challengeId: string) {
    return this.metricsAdminChallengeService.getChallengeReport(challengeId);
  }
}
