import { apiClient } from './apiClient';

export interface SurveyQuantitativeItem {
  id: string;
  statement: string;
}

export interface SurveyQualitativeItem {
  id: string;
  label: string;
}

// Parte QUANTITATIVA - escala Likert de concordância (1–5), metodologia
// "Personal Opinion Surveys in Software Engineering" (Ciolkowski,
// Laitenberger, Rombach, Biffl, cap. em Shull/Singer/Sjøberg (eds.), Guide
// to Advanced Empirical Software Engineering, 2008): opinião/percepção
// auto-reportada, um conceito por item (nunca "dupla-barreled" - nunca
// "foi fácil E rápido" no mesmo item), linguagem direta sem jargão. Cada
// item mapeia numa barreira institucional/formação docente do RQ4 (ver
// docs/ai/persona.md) - a mesma pergunta de pesquisa que motivou o
// GuidedTour, agora com um instrumento de medida validado, não uma escala
// inventada ad-hoc. `id` é a chave persistida em `SurveyResponse
// .quantitative` (backend) - renomear aqui sem atualizar dado histórico
// quebra a série temporal desse item; preferir ACRESCENTAR um item novo a
// renomear um existente.
export const CHALLENGE_CREATION_SURVEY_QUANTITATIVE_ITEMS: SurveyQuantitativeItem[] = [
  { id: 'ease_of_creation', statement: 'Foi fácil criar este desafio usando este formulário.' },
  {
    id: 'confidence_without_checking',
    statement:
      'Eu me senti confiante de que o desafio ficaria correto mesmo sem usar o botão "Visualizar como aluno".',
  },
  {
    id: 'pedagogical_language_clarity',
    statement: 'A linguagem do formulário foi clara, sem termos técnicos de programação.',
  },
  {
    id: 'tutorial_helpfulness',
    statement: 'O tutorial/as instruções ajudaram nas partes em que tive dúvida.',
  },
  { id: 'overall_satisfaction', statement: 'No geral, estou satisfeito(a) com o processo de criar este desafio.' },
];

// Parte QUALITATIVA - perguntas abertas, metodologia "Case Study Research
// in Software Engineering: Guidelines and Examples" (Runeson, Höst,
// Rainer, Regnell, 2012): perguntas não-indutivas buscando CONTEXTO/
// RACIONAL ("o que foi difícil", "o que ajudaria"), nunca uma pergunta
// fechada de sim/não que já embute a resposta esperada.
export const CHALLENGE_CREATION_SURVEY_QUALITATIVE_ITEMS: SurveyQualitativeItem[] = [
  { id: 'difficulties', label: 'O que foi mais difícil (se algo foi) durante a criação deste desafio?' },
  { id: 'improvement_suggestions', label: 'O que poderia tornar esse processo mais fácil ou mais rápido?' },
];

export interface SubmitChallengeCreationSurveyInput {
  challengeId: string;
  status: 'submitted' | 'declined';
  quantitative?: Record<string, number>;
  qualitative?: Record<string, string>;
}

// Wrapper fino sobre `POST /surveys/challenge-creation` - mesmo racional de
// `logEvent.ts` (nunca `apiClient`/`fetch` direto espalhado pela tela).
export function submitChallengeCreationSurvey(input: SubmitChallengeCreationSurveyInput): Promise<void> {
  return apiClient.post('/surveys/challenge-creation', input);
}
