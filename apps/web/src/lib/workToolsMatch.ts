import type { WorkToolsMatchPair, WorkToolsScenario, WorkToolsStatement } from './workToolsLevelTypes';

// MJ10 — lógica pura de avaliação do jogo "Ferramentas do Mundo do
// Trabalho" (ligar + verdadeiro ou falso), mesmo racional de
// lib/fractionsFactory.ts: nada aqui depende de React/Zustand, testável
// isolado. Nada é gabarito oculto (ver mini-game-level-config.interface.ts
// no backend) — estas funções só COMPARAM o que o config já expõe por
// inteiro, nunca escondem a resposta.

export function isMatchCorrect(pair: WorkToolsMatchPair, correctMatches: WorkToolsMatchPair[]): boolean {
  return correctMatches.some(
    (correct) => correct.scenarioId === pair.scenarioId && correct.toolId === pair.toolId,
  );
}

export function isStatementAnswerCorrect(statement: WorkToolsStatement, answeredTrue: boolean): boolean {
  return statement.isTrue === answeredTrue;
}

// AC de MJ10: as afirmações só liberam depois que TODO cenário visível tem
// um par E esse par está correto — nunca "todo cenário tem ALGUM par", o
// que deixaria passar um par errado sem correção.
export function allScenariosCorrectlyMatched(
  scenarios: WorkToolsScenario[],
  matches: WorkToolsMatchPair[],
  correctMatches: WorkToolsMatchPair[],
): boolean {
  return scenarios.every((scenario) => {
    const match = matches.find((candidate) => candidate.scenarioId === scenario.id);
    return match !== undefined && isMatchCorrect(match, correctMatches);
  });
}

export function allStatementsAnsweredCorrectly(
  statements: WorkToolsStatement[],
  answers: Record<string, boolean>,
): boolean {
  return statements.every((statement) => answers[statement.id] === statement.isTrue);
}

// "Novo cenário" (fase Make do Create) — mesmo racional de `pickFraction`
// em FractionsGamePage: amostragem simples, sem garantia de nunca repetir a
// rodada anterior (mesma simplicidade já aceita lá).
export function pickRandomScenarios(pool: WorkToolsScenario[], count: number): WorkToolsScenario[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
