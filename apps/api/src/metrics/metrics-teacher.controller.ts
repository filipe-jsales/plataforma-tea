import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { MetricsTeacherService } from './metrics-teacher.service';

// 6.3/6.4 — painel do professor. Escopo de titularidade (classroom.teacherId
// === req.user.sub) é responsabilidade do serviço, não deste controller —
// checado antes de qualquer query em ambas as rotas (ver assertOwnClassroom
// em MetricsTeacherService).
@Controller('metrics/teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class MetricsTeacherController {
  constructor(private readonly metricsTeacherService: MetricsTeacherService) {}

  @Get('classrooms/:classroomId/students')
  getStudentsProgress(
    @Param('classroomId') classroomId: string,
    @Request() req: { user: JwtPayload },
  ) {
    return this.metricsTeacherService.getStudentsProgress(classroomId, req.user.sub);
  }

  @Get('classrooms/:classroomId/summary')
  getClassroomSummary(
    @Param('classroomId') classroomId: string,
    @Request() req: { user: JwtPayload },
  ) {
    return this.metricsTeacherService.getClassroomSummary(classroomId, req.user.sub);
  }

  // MJ8 — os dois sinais (desafio de blocos × mini jogo) lado a lado, pro
  // mesmo conceito, escopado à turma do professor autenticado (mesma
  // titularidade que as rotas acima).
  @Get('classrooms/:classroomId/concept-comparison')
  getConceptComparison(
    @Param('classroomId') classroomId: string,
    @Query('conceptId') conceptId: string,
    @Request() req: { user: JwtPayload },
  ) {
    return this.metricsTeacherService.getConceptComparison(classroomId, req.user.sub, conceptId);
  }
}
