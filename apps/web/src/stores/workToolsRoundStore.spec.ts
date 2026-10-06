import { describe, expect, it } from 'vitest';
import { createWorkToolsRoundStore } from './workToolsRoundStore';

describe('createWorkToolsRoundStore', () => {
  it('is a factory - two instances never share state', () => {
    const a = createWorkToolsRoundStore();
    const b = createWorkToolsRoundStore();

    a.getState().setMatch('s1', 't1');

    expect(b.getState().matches).toEqual([]);
  });

  it('starts empty by default', () => {
    const store = createWorkToolsRoundStore();
    expect(store.getState()).toMatchObject({ matches: [], statementAnswers: {} });
  });

  it('starts seeded when a preset is given (Use/Modify levels)', () => {
    const store = createWorkToolsRoundStore({
      matches: [{ scenarioId: 's1', toolId: 't1' }],
      statementAnswers: { st1: true },
    });

    expect(store.getState()).toMatchObject({
      matches: [{ scenarioId: 's1', toolId: 't1' }],
      statementAnswers: { st1: true },
    });
  });

  it('setMatch replaces any previous pair for the same scenario, never accumulates two', () => {
    const store = createWorkToolsRoundStore();

    store.getState().setMatch('s1', 't1');
    store.getState().setMatch('s1', 't2');

    expect(store.getState().matches).toEqual([{ scenarioId: 's1', toolId: 't2' }]);
  });

  it('setMatch preserves matches for other scenarios', () => {
    const store = createWorkToolsRoundStore();

    store.getState().setMatch('s1', 't1');
    store.getState().setMatch('s2', 't2');

    expect(store.getState().matches).toEqual([
      { scenarioId: 's1', toolId: 't1' },
      { scenarioId: 's2', toolId: 't2' },
    ]);
  });

  it('removeMatch clears only the given scenario pair', () => {
    const store = createWorkToolsRoundStore();
    store.getState().setMatch('s1', 't1');
    store.getState().setMatch('s2', 't2');

    store.getState().removeMatch('s1');

    expect(store.getState().matches).toEqual([{ scenarioId: 's2', toolId: 't2' }]);
  });

  it('answerStatement records/overwrites the answer for that statement only', () => {
    const store = createWorkToolsRoundStore();

    store.getState().answerStatement('st1', true);
    store.getState().answerStatement('st2', false);
    store.getState().answerStatement('st1', false);

    expect(store.getState().statementAnswers).toEqual({ st1: false, st2: false });
  });

  it('reset clears back to empty when called with no seed', () => {
    const store = createWorkToolsRoundStore();
    store.getState().setMatch('s1', 't1');
    store.getState().answerStatement('st1', true);

    store.getState().reset();

    expect(store.getState()).toMatchObject({ matches: [], statementAnswers: {} });
  });

  it('reset can reseed with a new preset (e.g. "Novo cenário")', () => {
    const store = createWorkToolsRoundStore();
    store.getState().setMatch('s1', 't1');

    store.getState().reset({ matches: [{ scenarioId: 's3', toolId: 't3' }] });

    expect(store.getState().matches).toEqual([{ scenarioId: 's3', toolId: 't3' }]);
  });
});
