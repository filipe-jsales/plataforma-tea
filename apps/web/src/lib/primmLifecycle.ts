// MJ1 - as 5 fases do ciclo PRIMM (Predict → Run → Investigate → Modify →
// Make) como arquitetura INTERNA do mini jogo (regra não-negociável 3 -
// mesmo racional já documentado pro desafio de blocos em
// challenge-config.interface.ts, "nota de pesquisa: motor PRIMM"). Nunca
// exposta como rótulo na UI do aluno - só o vocabulário interno que o
// motor/`logEvent` usam pra descrever em que ponto do ciclo a cena está.
export const PRIMM_PHASES = ['predict', 'run', 'investigate', 'modify', 'make'] as const;

export type PrimmPhase = (typeof PRIMM_PHASES)[number];

export function nextPrimmPhase(current: PrimmPhase): PrimmPhase | null {
  const index = PRIMM_PHASES.indexOf(current);
  return index >= 0 && index < PRIMM_PHASES.length - 1 ? PRIMM_PHASES[index + 1] : null;
}

export function isFinalPrimmPhase(phase: PrimmPhase): boolean {
  return phase === PRIMM_PHASES[PRIMM_PHASES.length - 1];
}
