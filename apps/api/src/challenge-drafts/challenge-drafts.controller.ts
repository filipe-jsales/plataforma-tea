import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { ChallengeDraftsService } from './challenge-drafts.service';
import { UpsertChallengeDraftDto } from './dto/upsert-challenge-draft.dto';

export interface ChallengeDraftResponse {
  workspaceJson: Record<string, unknown> | null;
}

// C2 — autosave incremental do workspace Blockly: sempre escopado ao
// PRÓPRIO aluno autenticado (`req.user.sub`, nunca um id vindo do
// corpo/query) — mesmo padrão/prefixo de
// `StudentClassroomChallengesController` (`students/me/...`).
@Controller('students/me/challenges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class ChallengeDraftsController {
  constructor(private readonly draftsService: ChallengeDraftsService) {}

  @Get(':challengeId/draft')
  async getDraft(
    @Param('challengeId') challengeId: string,
    @Request() req: { user: JwtPayload },
  ): Promise<ChallengeDraftResponse> {
    const draft = await this.draftsService.findByStudentAndChallenge(
      req.user.sub,
      challengeId,
    );
    return { workspaceJson: draft?.workspaceJson ?? null };
  }

  @Patch(':challengeId/draft')
  @HttpCode(204)
  async saveDraft(
    @Param('challengeId') challengeId: string,
    @Body() dto: UpsertChallengeDraftDto,
    @Request() req: { user: JwtPayload },
  ): Promise<void> {
    await this.draftsService.upsert(
      req.user.sub,
      challengeId,
      dto.workspaceJson,
    );
  }

  @Delete(':challengeId/draft')
  @HttpCode(204)
  async discardDraft(
    @Param('challengeId') challengeId: string,
    @Request() req: { user: JwtPayload },
  ): Promise<void> {
    await this.draftsService.discard(req.user.sub, challengeId);
  }
}
