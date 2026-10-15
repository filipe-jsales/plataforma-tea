import { describe, expect, it } from 'vitest';
import { analyzeSchedule, buildRound, describeOp, serialOps, simulate, type Op } from './engine';

const slideLostUpdate: Op[] = [
  { tx: 'T1', kind: 'read', item: 'X' },
  { tx: 'T2', kind: 'read', item: 'X' },
  { tx: 'T2', kind: 'compute', item: 'X', delta: -4 },
  { tx: 'T1', kind: 'compute', item: 'X', delta: -5 },
  { tx: 'T2', kind: 'write', item: 'X' },
  { tx: 'T1', kind: 'write', item: 'X' },
];

describe('simulate', () => {
  it('reproduz o slide de perda de atualização: X = 80, N = 5, M = 4 termina em 75, esperado 71', () => {
    const sim = simulate({ X: 80 }, slideLostUpdate);
    expect(sim.db.X).toBe(75);
    expect(simulate({ X: 80 }, serialOps(slideLostUpdate)).db.X).toBe(71);
  });

  it('rollback restaura o valor anterior à gravação', () => {
    const sim = simulate({ X: 80 }, [
      { tx: 'T1', kind: 'read', item: 'X' },
      { tx: 'T1', kind: 'compute', item: 'X', delta: -5 },
      { tx: 'T1', kind: 'write', item: 'X' },
      { tx: 'T1', kind: 'rollback' },
    ]);
    expect(sim.steps[2].db.X).toBe(75);
    expect(sim.db.X).toBe(80);
  });

  it('falha se uma transação calcula sem ter lido', () => {
    expect(() => simulate({ X: 1 }, [{ tx: 'T1', kind: 'compute', item: 'X', delta: 1 }])).toThrow();
  });
});

describe('analyzeSchedule', () => {
  it('aponta as duas leituras do valor antigo e as duas gravações', () => {
    const analysis = analyzeSchedule({ X: 80 }, slideLostUpdate);
    expect(analysis.classification).toBe('lost_update');
    expect(analysis.culprits.map((c) => c.index)).toEqual([0, 1, 4, 5]);
  });

  it('leitura suja só existe se o escritor sofre rollback', () => {
    const base: Op[] = [
      { tx: 'T1', kind: 'read', item: 'X' },
      { tx: 'T1', kind: 'compute', item: 'X', delta: -5 },
      { tx: 'T1', kind: 'write', item: 'X' },
      { tx: 'T2', kind: 'read', item: 'X' },
    ];
    expect(analyzeSchedule({ X: 80 }, [...base, { tx: 'T1', kind: 'rollback' }]).classification).toBe('dirty_read');
    expect(analyzeSchedule({ X: 80 }, [...base, { tx: 'T1', kind: 'commit' }]).classification).toBe('none');
  });

  it('agregação só é incorreta quando mistura valores antigos e novos do mesmo escritor', () => {
    const w = (item: string, value: number): Op => ({ tx: 'T1', kind: 'write', item, value });
    const add = (item: string): Op => ({ tx: 'T3', kind: 'sum_add', item });
    const init: Op = { tx: 'T3', kind: 'sum_init' };
    const initial = { A: 10, B: 20, C: 30 };
    expect(analyzeSchedule(initial, [init, add('A'), add('B'), w('B', 15), w('C', 35), add('C')]).classification).toBe(
      'incorrect_summary',
    );
    expect(analyzeSchedule(initial, [init, add('A'), w('B', 15), w('C', 35), add('B'), add('C')]).classification).toBe(
      'none',
    );
  });
});

describe('buildRound', () => {
  it('calcula previsão serial e valor real do cenário de leitura suja', () => {
    const round = buildRound({
      id: 't',
      level: 1,
      initial: { X: 80 },
      target: { kind: 'item', item: 'X' },
      ops: [
        { tx: 'T1', kind: 'read', item: 'X' },
        { tx: 'T1', kind: 'compute', item: 'X', delta: -5 },
        { tx: 'T1', kind: 'write', item: 'X' },
        { tx: 'T2', kind: 'read', item: 'X' },
        { tx: 'T1', kind: 'rollback' },
        { tx: 'T2', kind: 'compute', item: 'X', delta: -4 },
        { tx: 'T2', kind: 'write', item: 'X' },
        { tx: 'T2', kind: 'commit' },
      ],
    });
    expect(round.serialValue).toBe(76);
    expect(round.realValue).toBe(71);
    expect(round.analysis.classification).toBe('dirty_read');
  });
});

describe('describeOp', () => {
  it('usa a notação da disciplina', () => {
    expect(describeOp({ tx: 'T1', kind: 'read', item: 'X' })).toBe('read_item(X)');
    expect(describeOp({ tx: 'T1', kind: 'compute', item: 'X', delta: -5 })).toBe('X := X - 5');
    expect(describeOp({ tx: 'T1', kind: 'write', item: 'B', value: 45 })).toBe('write_item(B) = 45');
  });
});
