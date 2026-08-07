import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { ChallengeTemplatesService } from './challenge-templates.service';
import { SaveTemplateChallengeDto } from './dto/save-template-challenge.dto';
import { TemplateParamsDto } from './dto/template-params.dto';

// 4.2 — galeria + formulário guiado (Modo Template). Professor só: a mesma
// barreira institucional que RolesGuard já aplica em todo endpoint de
// professor/admin (RQ4). Nenhuma rota aqui devolve XML/JSON do Blockly —
// ver ChallengeTemplatesService pra onde a tradução parâmetros→config
// acontece (regra não-negociável 9).
@Controller('challenge-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class ChallengeTemplatesController {
  constructor(private readonly templatesService: ChallengeTemplatesService) {}

  // AC1 — galeria de templates.
  @Get()
  listTemplates() {
    return this.templatesService.listTemplates();
  }

  // AC2 — formulário de parâmetros (schema já resolvido, pronto pra
  // renderizar genericamente).
  @Get(':id')
  getTemplateDetail(@Param('id') id: string) {
    return this.templatesService.getTemplateDetail(id);
  }

  // AC3 (validação pedagógica inline) + AC4 ("Visualizar como aluno") — o
  // mesmo endpoint serve os dois: sempre 200, `valid`/`errors` decidem se a
  // tela mostra os erros de campo ou o preview no Pixi.
  @Post(':id/preview')
  preview(@Param('id') id: string, @Body() dto: TemplateParamsDto) {
    return this.templatesService.preview(id, dto.params);
  }

  @Post(':id/challenges')
  createChallenge(
    @Param('id') id: string,
    @Body() dto: SaveTemplateChallengeDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.templatesService.createChallenge(id, req.user.sub, dto);
  }
}
