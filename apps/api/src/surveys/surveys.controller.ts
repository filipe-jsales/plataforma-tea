import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { SubmitChallengeCreationSurveyDto } from './dto/submit-challenge-creation-survey.dto';
import { SurveysService } from './surveys.service';

// Survey de pesquisa (opinião do professor sobre a própria experiência de
// autoria) — só professor, mesma barreira de RolesGuard de qualquer rota de
// autoria de desafio (RQ4). Sem `GET` aqui de propósito: nenhuma tela lê
// resposta de survey de volta (é dado de pesquisa, consumido por quem
// analisa depois, direto no banco/exportação — não uma preferência de UI
// pra devolver pro próprio professor).
@Controller('surveys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post('challenge-creation')
  submitChallengeCreationSurvey(
    @Body() dto: SubmitChallengeCreationSurveyDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.surveysService.submitChallengeCreationSurvey(req.user.sub, dto);
  }
}
