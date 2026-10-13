// F18 - dica em degraus na Ajuda do desafio `create`. O aluno escolhe quanto
// ajuda quer ver, um degrau por vez, e nunca é empurrado ao próximo:
//   1. uma pista sobre COMO a figura é feita (sem números)
//   2. os números da figura (lados e giro), em texto
//   3. a forma-alvo desenhada (o que a Ajuda sempre foi)
// Os dois primeiros são texto derivado do `goal`, nunca escrito à mão por
// desafio, então todo desafio ganha a escada sem conteúdo novo a curar.
export const HELP_LADDER_LAST_LEVEL = 3;

export interface HelpGoal {
  sides: number;
  turnAngleDeg: number;
}

export function buildHelpHint(level: 1 | 2, goal: HelpGoal): string {
  if (level === 1) {
    return 'Pense em como a figura é feita: o personagem anda um pedaço, vira, e repete isso até voltar ao começo.';
  }
  return `A figura tem ${goal.sides} lados, e o personagem vira ${goal.turnAngleDeg} graus a cada lado.`;
}

// Rótulo do botão para o PRÓXIMO degrau, a partir do degrau já aberto
// (0 = nenhum). Descreve o que vem, para o aluno decidir se quer.
export function nextHelpLabel(openLevel: number): string | null {
  if (openLevel <= 0) return 'Ajuda: uma pista';
  if (openLevel === 1) return 'Ajuda: mais uma pista';
  if (openLevel === 2) return 'Ajuda: ver a forma';
  return null;
}
