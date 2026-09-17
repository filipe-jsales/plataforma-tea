import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengesService } from '../challenges/challenges.service';
import { SubmitChallengeCreationSurveyDto } from './dto/submit-challenge-creation-survey.dto';
import { SurveyResponse } from './entities/survey-response.entity';
import { validateQualitativeAnswers, validateQuantitativeAnswers } from './survey-answers';

// Chave deste instrumento (ver SurveyResponse.surveyKey) — um survey futuro
// (outra tela, outro momento do fluxo) ganha a própria constante, nunca
// reaproveita esta.
export const CHALLENGE_CREATION_SURVEY_KEY = 'challenge_creation';

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(SurveyResponse)
    private readonly surveyResponsesRepository: Repository<SurveyResponse>,
    private readonly challengesService: ChallengesService,
  ) {}

  // Só aceita resposta sobre um desafio que o PRÓPRIO professor autenticado
  // criou (`findByIdForOwner`, mesma checagem de autorização de
  // editar/excluir em ChallengeTemplatesService) — nunca um `challengeId`
  // arbitrário, mesmo que a resposta em si não exponha dado de outro
  // professor.
  async submitChallengeCreationSurvey(
    teacherId: string,
    dto: SubmitChallengeCreationSurveyDto,
  ): Promise<SurveyResponse> {
    const challenge = await this.challengesService.findByIdForOwner(dto.challengeId, teacherId);
    if (!challenge) {
      throw new NotFoundException('Desafio não encontrado.');
    }

    // 'declined' nunca carrega resposta, mesmo que o corpo da requisição
    // tenha enviado algo por engano — o status já diz "a pessoa optou por
    // não responder".
    const quantitative = dto.status === 'declined' ? {} : validateQuantitativeAnswers(dto.quantitative);
    const qualitative = dto.status === 'declined' ? {} : validateQualitativeAnswers(dto.qualitative);

    const response = this.surveyResponsesRepository.create({
      surveyKey: CHALLENGE_CREATION_SURVEY_KEY,
      teacherUserId: teacherId,
      challengeId: challenge.id,
      templateKey: challenge.template?.key ?? null,
      status: dto.status,
      quantitative,
      qualitative,
    });
    return this.surveyResponsesRepository.save(response);
  }
}
