import { Body, Controller, Delete, Get, HttpCode, Param, Post, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { ChallengeAllocationsService } from './challenge-allocations.service';
import { AllocateChallengeDto } from './dto/allocate-challenge.dto';

// 4.3 (AC1/AC2/AC5) — o professor aloca/desaloca um desafio SEU a uma turma
// SUA. Nunca expõe/aceita turma de outro professor nem desafio de outro
// professor — as duas checagens vivem em ChallengeAllocationsService,
// nunca só aqui (defesa em profundidade, mesmo padrão do resto do
// projeto).
@Controller('teacher/challenges/:challengeId/allocations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class TeacherChallengeAllocationsController {
  constructor(private readonly allocationsService: ChallengeAllocationsService) {}

  @Get()
  list(@Param('challengeId') challengeId: string, @Request() req: { user: JwtPayload }) {
    return this.allocationsService.listForTeacherChallenge(challengeId, req.user.sub);
  }

  @Post()
  allocate(
    @Param('challengeId') challengeId: string,
    @Body() dto: AllocateChallengeDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.allocationsService.allocate(challengeId, req.user.sub, dto.classroomId);
  }

  @Delete(':classroomId')
  @HttpCode(204)
  async deallocate(
    @Param('challengeId') challengeId: string,
    @Param('classroomId') classroomId: string,
    @Request() req: { user: JwtPayload },
  ): Promise<void> {
    await this.allocationsService.deallocate(challengeId, req.user.sub, classroomId);
  }
}
