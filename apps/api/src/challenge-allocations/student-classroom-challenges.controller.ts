import { Controller, Get, HttpCode, Param, Post, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { ChallengeAllocationsService } from './challenge-allocations.service';

// 4.3 (AC2/AC3/AC4) — "trilha" do aluno: desafios que o professor alocou
// explicitamente à turma dele. Rota própria (`students/me/...`), não
// `GET /challenges/...`, pra nunca colidir com `ChallengesController`
// (`GET /challenges/:id`, aluno-só, já registrado noutro módulo) — duas
// rotas dinâmicas concorrendo pelo mesmo prefixo seria frágil.
@Controller('students/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StudentClassroomChallengesController {
  constructor(private readonly allocationsService: ChallengeAllocationsService) {}

  @Get('classroom-challenges')
  getClassroomChallenges(@Request() req: { user: JwtPayload }) {
    return this.allocationsService.findAvailableForStudent(req.user.sub);
  }

  // E1 (AC2) — chamado por `ChallengePage` assim que o desafio abre; nunca
  // uma ação explícita de "marcar como lido" pro aluno. Sempre escopado ao
  // próprio aluno autenticado (`req.user.sub`), nunca um id vindo do corpo.
  @Post('classroom-challenges/:challengeId/viewed')
  @HttpCode(204)
  markViewed(
    @Param('challengeId') challengeId: string,
    @Request() req: { user: JwtPayload },
  ): Promise<void> {
    return this.allocationsService.markChallengeViewed(req.user.sub, challengeId);
  }
}
