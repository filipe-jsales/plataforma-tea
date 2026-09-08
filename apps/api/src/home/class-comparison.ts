// 7.3 — "você está entre os alunos que mais praticaram esta semana", nunca
// um número/rank/nome de colega (regra não-negociável 5, AC de 7.3). Função
// pura: entra a contagem de atividade (RD-E, proxy de engajamento) de cada
// aluno ativo da turma + a do próprio aluno, sai só um booleano.
//
// "Entre os que mais praticaram" = metade de cima da turma por contagem de
// atividade, com empates decididos a favor do aluno (>= o valor de corte,
// não > estrito) — evita o caso perverso de uma turma pequena e homogênea
// nunca ter ninguém "entre os que mais praticaram" por causa de um empate.
// Turma sem NENHUMA atividade (todo mundo em 0) nunca conta como "entre os
// que mais praticaram" — não há prática nenhuma pra estar "entre".
export function computeAmongMostActiveThisWeek(
  classroomActivityCounts: number[],
  ownActivityCount: number,
): boolean {
  if (ownActivityCount === 0) {
    return false;
  }
  if (classroomActivityCounts.every((count) => count === 0)) {
    return false;
  }

  const sortedDescending = [...classroomActivityCounts].sort((a, b) => b - a);
  const topHalfSize = Math.max(1, Math.ceil(sortedDescending.length / 2));
  const threshold = sortedDescending[topHalfSize - 1];

  return ownActivityCount >= threshold;
}

// Segunda-feira 00:00:00 da semana de `reference` (fuso local do servidor —
// mesmo racional de `startOfToday` já usado em HomeService/
// MetricsTeacherService, sem UTC explícito porque nenhuma outra parte da
// plataforma normaliza fuso).
export function startOfCurrentWeek(reference: Date): Date {
  const start = new Date(reference);
  const day = start.getDay(); // 0 = domingo, 1 = segunda, ...
  const daysSinceMonday = (day + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}
