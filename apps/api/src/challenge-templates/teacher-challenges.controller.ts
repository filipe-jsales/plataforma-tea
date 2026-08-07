import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { ChallengeTemplatesService } from './challenge-templates.service';
import { SaveTemplateChallengeDto } from './dto/save-template-challenge.dto';

// 4.2 — AC5/AC6: "Meus desafios" do professor. Toda rota aqui devolve
// exatamente a mesma forma (título/enunciado/parâmetros do formulário
// guiado) que a tela de criação já usa — nenhuma delas expõe `Challenge.
// config`/estrutura de blocos (regra não-negociável 9). Rota separada de
// ChallengeTemplatesController (`/challenge-templates`) porque o recurso
// aqui é "o desafio que o professor é dono", não "o catálogo de templates".
@Controller('teacher/challenges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class TeacherChallengesController {
  constructor(private readonly templatesService: ChallengeTemplatesService) {}

  @Get()
  listMine(@Request() req: { user: JwtPayload }) {
    return this.templatesService.listMine(req.user.sub);
  }

  @Get(':id')
  getMine(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.templatesService.getMineOrThrow(id, req.user.sub);
  }

  @Patch(':id')
  updateMine(
    @Param('id') id: string,
    @Body() dto: SaveTemplateChallengeDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.templatesService.updateMine(id, req.user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async removeMine(@Param('id') id: string, @Request() req: { user: JwtPayload }): Promise<void> {
    await this.templatesService.removeMine(id, req.user.sub);
  }
}
