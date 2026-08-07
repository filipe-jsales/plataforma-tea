import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { toCsv, type CsvCell } from './csv';
import { ExportEventsQueryDto } from './dto/export-events-query.dto';
import { MetricsAdminChallengeService } from './metrics-admin-challenge.service';
import { MetricsAdminExportService } from './metrics-admin-export.service';
import { MetricsAdminService } from './metrics-admin.service';

const EXPORT_CSV_HEADERS = [
  'id',
  'studentPseudoId',
  'category',
  'type',
  'payload',
  'sessionId',
  'challengeId',
  'createdAt',
];

// 6.2/6.5/6.6 — painel institucional + relatório de profundidade por
// desafio + exportação bruta pra pesquisa, todos do admin. Admin só, sem
// escopo de titularidade (diferente do painel do professor, que trava por
// Classroom.teacherId) — ver docs/ai/backlog/metricas-professor-admin.md.
@Controller('metrics/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MetricsAdminController {
  constructor(
    private readonly metricsAdminService: MetricsAdminService,
    private readonly metricsAdminChallengeService: MetricsAdminChallengeService,
    private readonly metricsAdminExportService: MetricsAdminExportService,
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

  // 6.6 — exportação de dados brutos. `ThrottlerGuard` só nesta rota (não
  // na classe inteira, que continua sem limite) — é a única que expõe
  // volume de dado por requisição grande o bastante pra justificar rate
  // limit (ver `ThrottlerModule.forRoot` em `MetricsModule`). CSV monta o
  // corpo/headers na mão (`@Res({ passthrough: true })`) porque só este
  // formato precisa de `Content-Type`/`Content-Disposition` diferentes do
  // JSON default do Nest — `passthrough: true` mantém o `return` normal
  // pro formato `json`.
  @Get('export')
  @UseGuards(ThrottlerGuard)
  async exportEvents(
    @Query() query: ExportEventsQueryDto,
    @Request() req: { user: JwtPayload },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.metricsAdminExportService.exportEvents(
      query,
      req.user.sub,
    );

    if (query.format === 'csv') {
      const rows: CsvCell[][] = result.rows.map((row) => [
        row.id,
        row.studentPseudoId,
        row.category,
        row.type,
        JSON.stringify(row.payload),
        row.sessionId,
        row.challengeId,
        row.createdAt,
      ]);
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="interaction-events-page${result.page}.csv"`,
      });
      return toCsv(EXPORT_CSV_HEADERS, rows);
    }

    return result;
  }
}
