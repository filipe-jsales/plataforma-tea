// 4.3 - mesma forma que a API de challenge-allocations devolve. Duplicado
// aqui de propósito (mesmo padrão de challengeTemplateTypes.ts - não há
// pacote compartilhado entre as duas apps neste monorepo).
export interface TeacherClassroomOption {
  id: string;
  name: string;
  joinCode: string;
}

export interface ClassroomAllocationSummary {
  classroomId: string;
  classroomName: string;
  classroomJoinCode: string;
}

export interface AvailableChallengeForStudent {
  id: string;
  title: string;
  prompt: string;
  // E1 - "nunca aberto por este aluno", nunca uma contagem/prazo.
  isNew: boolean;
}
