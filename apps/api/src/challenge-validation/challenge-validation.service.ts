import { Injectable, NotFoundException } from '@nestjs/common';
import {
  isChallengeConfig,
  type SerializedBlockState,
} from '../challenges/challenge-config.interface';
import { ChallengesService } from '../challenges/challenges.service';
import { validateWaterProgramAgainstTestCases } from '../challenges/water-program';
import { EventCategory } from '../common/enums/event-category.enum';
import { EventsService } from '../events/events.service';

// 3.17 — "roda o programa do aluno contra o modelo esperado" É AUTORIDADE
// DO BACKEND, nunca confiada ao frontend: o aluno poderia, em tese, forjar
// uma requisição alegando ter acertado. O resultado nunca volta pro
// frontend em forma avaliativa (o método devolve só `validated`, ver
// controller) — fica gravado como evento RD-C, lido só pelo relatório do
// professor (MetricsAdminChallengeService), nunca pela rota do aluno
// (ChallengesController nunca lê `challenge_config.expectedModel`).
@Injectable()
export class ChallengeValidationService {
  constructor(
    private readonly challengesService: ChallengesService,
    private readonly eventsService: EventsService,
  ) {}

  // Silenciosamente um no-op (`validated: false`) quando o desafio não tem
  // `expectedModel` — cobre tanto "desafio não é o 2.3 de água" quanto
  // "professor ainda não configurou um cenário pra este 2.3" (curado via
  // seed hoje, ver SeedEstadosDaMateriaCreateChallenge). Nunca lança erro
  // nesse caso: o aluno clicando Executar num desafio sem cenário
  // configurado é um fluxo normal, não uma falha.
  async submitWaterProgram(
    studentPseudoId: string,
    challengeId: string,
    program: SerializedBlockState | null,
  ): Promise<{ validated: boolean }> {
    const challenge = await this.challengesService.findById(challengeId);
    if (!challenge) {
      throw new NotFoundException('Desafio não encontrado.');
    }
    if (
      !isChallengeConfig(challenge.config) ||
      !challenge.config.expectedModel
    ) {
      return { validated: false };
    }

    const { scenarioLabel, testCases } = challenge.config.expectedModel;
    const result = validateWaterProgramAgainstTestCases(program, testCases);

    await this.eventsService.record({
      studentPseudoId,
      category: EventCategory.CURRICULAR,
      type: 'water_program_validated',
      challengeId,
      payload: {
        challenge_id: challengeId,
        scenario_label: scenarioLabel,
        case_results: result.caseResults,
        correct_count: result.correctCount,
        total_count: result.totalCount,
        all_passed: result.allPassed,
        timestamp: new Date().toISOString(),
      },
    });

    return { validated: true };
  }
}
