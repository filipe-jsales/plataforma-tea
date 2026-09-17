import { IsIn, IsObject, IsOptional, IsUUID } from 'class-validator';
import type { SurveyResponseStatus } from '../entities/survey-response.entity';

// `class-validator` só garante a FORMA do corpo (regra do projeto: DTO +
// `ValidationPipe` global, nunca validação manual no controller) — o
// CONTEÚDO de `quantitative`/`qualitative` (valores Likert 1–5, tamanho
// máximo de texto livre) é validado em `SurveysService.validateAnswers`,
// mesmo racional de `TemplateParamsDto` (a forma de `params` também é
// livre por design, a validação pedagógica de verdade vive no service).
export class SubmitChallengeCreationSurveyDto {
  @IsUUID()
  challengeId: string;

  // 'declined' registra que o professor viu o convite e escolheu não
  // responder (ver SurveyResponse.status) — sempre com
  // `quantitative`/`qualitative` ausentes/vazios nesse caso.
  @IsIn(['submitted', 'declined'])
  status: SurveyResponseStatus;

  @IsOptional()
  @IsObject()
  quantitative?: Record<string, number>;

  @IsOptional()
  @IsObject()
  qualitative?: Record<string, string>;
}
