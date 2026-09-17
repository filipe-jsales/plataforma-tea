import { BadRequestException } from '@nestjs/common';

const MIN_LIKERT = 1;
const MAX_LIKERT = 5;
// Pergunta aberta de survey (Case Study Research in SE) — bem mais generoso
// que os 200 caracteres de `feedback-messages.ts` (aquilo é uma frase curta
// mostrada na tela do aluno; isto é resposta livre de pesquisa).
const MAX_QUALITATIVE_LENGTH = 4000;

// Funções puras — validam o CONTEÚDO de `quantitative`/`qualitative` (a
// FORMA já foi garantida pelo DTO/`ValidationPipe`, ver
// SubmitChallengeCreationSurveyDto). Nunca filtra silenciosamente um valor
// fora do range: um Likert fora de 1–5 ou uma resposta não-string indica
// corpo malformado/adulterado (o frontend só oferece os 5 valores válidos
// via SegmentedControl, ver LikertScaleField) — dado de pesquisa errado
// salvo silenciosamente é pior que um 400.
export function validateQuantitativeAnswers(answers: Record<string, number> | undefined): Record<string, number> {
  if (!answers) return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!Number.isInteger(value) || value < MIN_LIKERT || value > MAX_LIKERT) {
      throw new BadRequestException(
        `Resposta inválida para "${key}" — use um valor entre ${MIN_LIKERT} e ${MAX_LIKERT}.`,
      );
    }
    result[key] = value;
  }
  return result;
}

// Descarta só entradas vazias (string em branco = "não respondeu esta
// pergunta", nunca persistida) — resposta parcial é esperada e válida em
// survey research, forçar todo item preenchido introduziria viés de
// resposta forçada.
export function validateQualitativeAnswers(answers: Record<string, string> | undefined): Record<string, string> {
  if (!answers) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value !== 'string') {
      throw new BadRequestException(`Resposta inválida para "${key}".`);
    }
    const trimmed = value.trim();
    if (trimmed.length > MAX_QUALITATIVE_LENGTH) {
      throw new BadRequestException(`A resposta para "${key}" passou de ${MAX_QUALITATIVE_LENGTH} caracteres.`);
    }
    if (trimmed) {
      result[key] = trimmed;
    }
  }
  return result;
}
