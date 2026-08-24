import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { MinigamesService } from './minigames.service';

// Aluno só — mesmo padrão de ChallengesController: o catálogo de níveis é
// curado (seed) ou editado pelo professor via /teacher/minigames, nunca
// autorado numa tela do aluno. Nada aqui precisa ficar oculto do aluno (ver
// nota em mini-game-level-config.interface.ts) — devolve `config` inteiro.
@Controller('minigames')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class MinigamesController {
  constructor(private readonly minigamesService: MinigamesService) {}

  @Get('levels')
  listLevels(@Query('conceptId') conceptId: string) {
    return this.minigamesService.findByConceptId(conceptId);
  }
}
