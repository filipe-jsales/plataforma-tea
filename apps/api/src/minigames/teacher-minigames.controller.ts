import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { UpdateMiniGameLevelDto } from './dto/update-mini-game-level.dto';
import { MinigamesService } from './minigames.service';

// Painel do professor pro jogo (pedido explícito do produto: "professor
// possa configurar") — tema/fração-alvo/pool de frações por nível, sem
// exigir conhecimento técnico (regra não-negociável 9). Sem escopo por
// turma/escola: níveis são currículo global (mesmo modelo de
// Challenge/ChallengeTemplate, não existe precedente de settings por
// turma neste repo).
@Controller('teacher/minigames')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class TeacherMinigamesController {
  constructor(private readonly minigamesService: MinigamesService) {}

  @Get('levels')
  listLevels(@Query('conceptId') conceptId: string) {
    return this.minigamesService.findByConceptId(conceptId);
  }

  @Patch('levels/:id')
  updateLevel(
    @Param('id') id: string,
    @Body() dto: UpdateMiniGameLevelDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.minigamesService.updateLevelConfig(id, req.user.sub, dto);
  }
}
