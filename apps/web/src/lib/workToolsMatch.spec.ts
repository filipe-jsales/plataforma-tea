import { describe, expect, it, vi } from 'vitest';
import {
  allScenariosCorrectlyMatched,
  allStatementsAnsweredCorrectly,
  isMatchCorrect,
  isStatementAnswerCorrect,
  pickRandomScenarios,
} from './workToolsMatch';
import type { WorkToolsMatchPair, WorkToolsScenario, WorkToolsStatement } from './workToolsLevelTypes';

const correctMatches: WorkToolsMatchPair[] = [
  { scenarioId: 's1', toolId: 't1' },
  { scenarioId: 's2', toolId: 't2' },
];

const scenarios: WorkToolsScenario[] = [
  { id: 's1', label: 'Cenário 1', icon: '🏭' },
  { id: 's2', label: 'Cenário 2', icon: '🗂️' },
];

const statements: WorkToolsStatement[] = [
  { id: 'st1', text: 'Afirmação 1', isTrue: true, explanation: 'porque sim' },
  { id: 'st2', text: 'Afirmação 2', isTrue: false, explanation: 'porque não' },
];

describe('isMatchCorrect', () => {
  it('returns true for a pair present in correctMatches', () => {
    expect(isMatchCorrect({ scenarioId: 's1', toolId: 't1' }, correctMatches)).toBe(true);
  });

  it('returns false for a scenario matched to the wrong tool', () => {
    expect(isMatchCorrect({ scenarioId: 's1', toolId: 't2' }, correctMatches)).toBe(false);
  });
});

describe('isStatementAnswerCorrect', () => {
  it('returns true when the answer matches isTrue', () => {
    expect(isStatementAnswerCorrect(statements[0], true)).toBe(true);
    expect(isStatementAnswerCorrect(statements[1], false)).toBe(true);
  });

  it('returns false when the answer does not match isTrue', () => {
    expect(isStatementAnswerCorrect(statements[0], false)).toBe(false);
  });
});

describe('allScenariosCorrectlyMatched', () => {
  it('is false when a scenario has no match yet', () => {
    expect(allScenariosCorrectlyMatched(scenarios, [{ scenarioId: 's1', toolId: 't1' }], correctMatches)).toBe(
      false,
    );
  });

  it('is false when a scenario is matched to the wrong tool, even if every scenario has SOME match', () => {
    const matches: WorkToolsMatchPair[] = [
      { scenarioId: 's1', toolId: 't1' },
      { scenarioId: 's2', toolId: 't1' },
    ];
    expect(allScenariosCorrectlyMatched(scenarios, matches, correctMatches)).toBe(false);
  });

  it('is true when every scenario has its correct match', () => {
    expect(allScenariosCorrectlyMatched(scenarios, correctMatches, correctMatches)).toBe(true);
  });

  it('is vacuously true for an empty scenario list', () => {
    expect(allScenariosCorrectlyMatched([], [], correctMatches)).toBe(true);
  });
});

describe('allStatementsAnsweredCorrectly', () => {
  it('is false when a statement is unanswered', () => {
    expect(allStatementsAnsweredCorrectly(statements, { st1: true })).toBe(false);
  });

  it('is false when a statement is answered wrong', () => {
    expect(allStatementsAnsweredCorrectly(statements, { st1: true, st2: true })).toBe(false);
  });

  it('is true when every statement is answered correctly', () => {
    expect(allStatementsAnsweredCorrectly(statements, { st1: true, st2: false })).toBe(true);
  });
});

describe('pickRandomScenarios', () => {
  it('never returns more items than the pool has', () => {
    expect(pickRandomScenarios(scenarios, 5)).toHaveLength(2);
  });

  it('returns exactly `count` items when the pool is large enough', () => {
    expect(pickRandomScenarios(scenarios, 1)).toHaveLength(1);
  });

  it('only returns items that exist in the pool', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const picked = pickRandomScenarios(scenarios, 2);
    expect(picked.every((scenario) => scenarios.includes(scenario))).toBe(true);
    vi.restoreAllMocks();
  });
});
