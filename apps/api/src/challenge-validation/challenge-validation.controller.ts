import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { ChallengeValidationService } from './challenge-validation.service';
import { SubmitWaterProgramDto } from './dto/submit-water-program.dto';

// 3.17 — mesmo prefixo/padrão de ChallengeDraftsController
// (`students/me/challenges/...`, sempre escopado ao PRÓPRIO aluno
// autenticado via `req.user`, nunca um id vindo do corpo). Resposta
// SEMPRE só `{ validated: boolean }` — nunca corretude, nunca "quantos
// acertou": essa informação é RD-C interno, lido só pelo relatório do
// professor (ver ChallengeValidationService).
@Controller('students/me/challenges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class ChallengeValidationController {
  constructor(private readonly validationService: ChallengeValidationService) {}

  @Post(':challengeId/submit-program')
  @HttpCode(200)
  submitProgram(
    @Param('challengeId') challengeId: string,
    @Body() dto: SubmitWaterProgramDto,
    @Request() req: { user: JwtPayload },
  ): Promise<{ validated: boolean }> {
    return this.validationService.submitWaterProgram(
      req.user.pseudonymId,
      challengeId,
      dto.program,
    );
  }
}
