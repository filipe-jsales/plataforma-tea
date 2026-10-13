// F17 - agenda visual da sessão (TEACCH): as etapas do tópico e qual é a
// atual. Só estágio e posição: nunca tempo estimado, contagem regressiva ou
// pontuação (regra não-negociável 5).
export type AgendaStage = 'use' | 'modify' | 'create';

export interface ChallengeAgenda {
  stages: AgendaStage[];
  currentIndex: number;
}

export type AgendaStepStatus = 'done' | 'current' | 'next';

export interface AgendaStep {
  stage: AgendaStage;
  label: string;
  status: AgendaStepStatus;
}

// Linguagem de aluno, nunca o vocabulário do framework (regra 3).
const STAGE_LABEL: Record<AgendaStage, string> = {
  use: 'Ver como funciona',
  modify: 'Mudar os números',
  create: 'Montar sozinho',
};

export function buildAgendaSteps(agenda: ChallengeAgenda | null | undefined): AgendaStep[] {
  if (!agenda || agenda.stages.length < 2) return [];
  return agenda.stages.map((stage, index) => ({
    stage,
    label: STAGE_LABEL[stage],
    status: index < agenda.currentIndex ? 'done' : index === agenda.currentIndex ? 'current' : 'next',
  }));
}
