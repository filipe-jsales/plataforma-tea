import type { Op, Scenario, TxId } from './engine';

export type Rng = () => number;

const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const pick = <T>(rng: Rng, list: T[]): T => list[Math.floor(rng() * list.length)];

function distinct(rng: Rng, count: number, min: number, max: number): number[] {
  const values: number[] = [];
  while (values.length < count) {
    const candidate = randInt(rng, min, max);
    if (!values.includes(candidate)) values.push(candidate);
  }
  return values;
}

const read = (tx: TxId, item: string): Op => ({ tx, kind: 'read', item });
const sub = (tx: TxId, item: string, amount: number): Op => ({ tx, kind: 'compute', item, delta: -amount });
const write = (tx: TxId, item: string, value?: number): Op => ({ tx, kind: 'write', item, value });
const commit = (tx: TxId): Op => ({ tx, kind: 'commit' });
const rollback = (tx: TxId): Op => ({ tx, kind: 'rollback' });
const sumInit = (tx: TxId): Op => ({ tx, kind: 'sum_init' });
const sumAdd = (tx: TxId, item: string): Op => ({ tx, kind: 'sum_add', item });

export type SlotType = 'lost_update' | 'dirty_read' | 'incorrect_summary' | 'none';

type Build = (rng: Rng) => Omit<Scenario, 'id' | 'level'>;

interface Template {
  id: string;
  level: 1 | 2 | 3;
  type: SlotType;
  build: Build;
}

const TEMPLATES: Template[] = [
  {
    id: 'lost-2tx',
    level: 1,
    type: 'lost_update',
    build: (rng) => {
      const [x, n, m] = [randInt(rng, 60, 99), ...distinct(rng, 2, 2, 9)];
      const t1First = rng() < 0.5;
      return {
        initial: { X: x },
        ops: [
          read('T1', 'X'),
          read('T2', 'X'),
          sub('T1', 'X', n),
          sub('T2', 'X', m),
          ...(t1First ? [write('T1', 'X'), write('T2', 'X')] : [write('T2', 'X'), write('T1', 'X')]),
          commit('T1'),
          commit('T2'),
        ],
        target: { kind: 'item', item: 'X' },
      };
    },
  },
  {
    id: 'dirty-2tx',
    level: 1,
    type: 'dirty_read',
    build: (rng) => {
      const [x, n, m] = [randInt(rng, 60, 99), ...distinct(rng, 2, 2, 9)];
      return {
        initial: { X: x },
        ops: [
          read('T1', 'X'),
          sub('T1', 'X', n),
          write('T1', 'X'),
          read('T2', 'X'),
          rollback('T1'),
          sub('T2', 'X', m),
          write('T2', 'X'),
          commit('T2'),
        ],
        target: { kind: 'item', item: 'X' },
      };
    },
  },
  {
    id: 'clean-2tx',
    level: 1,
    type: 'none',
    build: (rng) => {
      const [x, n, m] = [randInt(rng, 60, 99), ...distinct(rng, 2, 2, 9)];
      if (rng() < 0.5) {
        // T2 só começa depois do commit de T1.
        return {
          initial: { X: x },
          ops: [
            read('T1', 'X'),
            sub('T1', 'X', n),
            write('T1', 'X'),
            commit('T1'),
            read('T2', 'X'),
            sub('T2', 'X', m),
            write('T2', 'X'),
            commit('T2'),
          ],
          target: { kind: 'item', item: 'X' },
        };
      }
      // T2 só lê o valor já confirmado, antes de T1 gravar.
      return {
        initial: { X: x },
        ops: [
          read('T2', 'X'),
          read('T1', 'X'),
          sub('T1', 'X', n),
          write('T1', 'X'),
          commit('T2'),
          commit('T1'),
        ],
        target: { kind: 'item', item: 'X' },
      };
    },
  },
  {
    id: 'lost-2tx-early-commit',
    level: 2,
    type: 'lost_update',
    build: (rng) => {
      const [x, n, m] = [randInt(rng, 60, 99), ...distinct(rng, 2, 2, 9)];
      return {
        initial: { X: x },
        ops: [
          read('T1', 'X'),
          sub('T1', 'X', n),
          read('T2', 'X'),
          write('T1', 'X'),
          commit('T1'),
          sub('T2', 'X', m),
          write('T2', 'X'),
          commit('T2'),
        ],
        target: { kind: 'item', item: 'X' },
      };
    },
  },
  {
    id: 'dirty-2tx-reader',
    level: 2,
    type: 'dirty_read',
    build: (rng) => {
      const [x, n] = [randInt(rng, 60, 99), randInt(rng, 2, 9)];
      return {
        initial: { X: x },
        ops: [
          read('T1', 'X'),
          sub('T1', 'X', n),
          write('T1', 'X'),
          read('T2', 'X'),
          rollback('T1'),
          commit('T2'),
        ],
        target: { kind: 'read', tx: 'T2', item: 'X' },
      };
    },
  },
  {
    id: 'clean-2tx-two-items',
    level: 2,
    type: 'none',
    build: (rng) => {
      const [x, y] = [randInt(rng, 60, 99), randInt(rng, 40, 80)];
      const [n, m] = distinct(rng, 2, 2, 9);
      return {
        initial: { X: x, Y: y },
        ops: [
          read('T1', 'X'),
          read('T2', 'Y'),
          sub('T1', 'X', n),
          sub('T2', 'Y', m),
          write('T1', 'X'),
          write('T2', 'Y'),
          commit('T1'),
          commit('T2'),
        ],
        target: { kind: 'item', item: 'X' },
      };
    },
  },
  {
    id: 'summary-3items',
    level: 2,
    type: 'incorrect_summary',
    build: (rng) => {
      const [a, b, c] = [randInt(rng, 20, 40), randInt(rng, 30, 60), randInt(rng, 20, 50)];
      const n = randInt(rng, 5, 15);
      return {
        initial: { A: a, B: b, C: c },
        ops: [
          sumInit('T3'),
          sumAdd('T3', 'A'),
          sumAdd('T3', 'B'),
          write('T1', 'B', b - n),
          write('T1', 'C', c + n),
          sumAdd('T3', 'C'),
          commit('T1'),
          commit('T3'),
        ],
        target: { kind: 'sum', tx: 'T3' },
      };
    },
  },
  {
    id: 'clean-summary-3items',
    level: 2,
    type: 'none',
    build: (rng) => {
      const [a, b, c] = [randInt(rng, 20, 40), randInt(rng, 30, 60), randInt(rng, 20, 50)];
      const n = randInt(rng, 5, 15);
      return {
        initial: { A: a, B: b, C: c },
        ops: [
          sumInit('T3'),
          sumAdd('T3', 'A'),
          write('T1', 'B', b - n),
          write('T1', 'C', c + n),
          commit('T1'),
          sumAdd('T3', 'B'),
          sumAdd('T3', 'C'),
          commit('T3'),
        ],
        target: { kind: 'sum', tx: 'T3' },
      };
    },
  },
  {
    id: 'lost-3tx',
    level: 3,
    type: 'lost_update',
    build: (rng) => {
      const x = randInt(rng, 60, 99);
      const [n, m, k] = distinct(rng, 3, 2, 9);
      return {
        initial: { X: x },
        ops: [
          read('T1', 'X'),
          read('T2', 'X'),
          read('T3', 'X'),
          sub('T1', 'X', n),
          sub('T2', 'X', m),
          sub('T3', 'X', k),
          write('T1', 'X'),
          write('T2', 'X'),
          write('T3', 'X'),
          commit('T1'),
          commit('T2'),
          commit('T3'),
        ],
        target: { kind: 'item', item: 'X' },
      };
    },
  },
  {
    id: 'dirty-3tx',
    level: 3,
    type: 'dirty_read',
    build: (rng) => {
      const [x, y] = [randInt(rng, 60, 99), randInt(rng, 40, 80)];
      const [n, m, k] = distinct(rng, 3, 2, 9);
      return {
        initial: { X: x, Y: y },
        ops: [
          read('T1', 'X'),
          read('T3', 'Y'),
          sub('T1', 'X', n),
          sub('T3', 'Y', k),
          write('T1', 'X'),
          read('T2', 'X'),
          write('T3', 'Y'),
          commit('T3'),
          rollback('T1'),
          sub('T2', 'X', m),
          write('T2', 'X'),
          commit('T2'),
        ],
        target: { kind: 'item', item: 'X' },
      };
    },
  },
  {
    id: 'summary-4items',
    level: 3,
    type: 'incorrect_summary',
    build: (rng) => {
      const [a, b, c, d] = [randInt(rng, 20, 40), randInt(rng, 30, 60), randInt(rng, 20, 50), randInt(rng, 30, 70)];
      const n = randInt(rng, 5, 15);
      return {
        initial: { A: a, B: b, C: c, D: d },
        ops: [
          sumInit('T3'),
          sumAdd('T3', 'A'),
          sumAdd('T3', 'B'),
          write('T1', 'B', b - n),
          sumAdd('T3', 'C'),
          write('T1', 'D', d + n),
          sumAdd('T3', 'D'),
          commit('T1'),
          commit('T3'),
        ],
        target: { kind: 'sum', tx: 'T3' },
      };
    },
  },
  {
    id: 'clean-3tx',
    level: 3,
    type: 'none',
    build: (rng) => {
      const [x, y] = [randInt(rng, 60, 99), randInt(rng, 40, 80)];
      const [n, m, k] = distinct(rng, 3, 2, 9);
      return {
        initial: { X: x, Y: y },
        ops: [
          read('T1', 'X'),
          read('T2', 'Y'),
          sub('T1', 'X', n),
          sub('T2', 'Y', m),
          write('T1', 'X'),
          commit('T1'),
          read('T3', 'X'),
          write('T2', 'Y'),
          sub('T3', 'X', k),
          commit('T2'),
          write('T3', 'X'),
          commit('T3'),
        ],
        target: { kind: 'item', item: 'X' },
      };
    },
  },
];

type Slot = [1 | 2 | 3, SlotType];

// Dificuldade progressiva: nível 1 (2 transações, 1 item) -> nível 3 (3
// transações ou vários itens). Todo plano mistura as três anomalias e casos
// limpos, para o aluno não marcar "tem problema" no automático.
const PLANS: Record<number, Slot[]> = {
  6: [
    [1, 'lost_update'],
    [1, 'none'],
    [2, 'dirty_read'],
    [2, 'incorrect_summary'],
    [2, 'none'],
    [3, 'lost_update'],
  ],
  8: [
    [1, 'lost_update'],
    [1, 'dirty_read'],
    [1, 'none'],
    [2, 'lost_update'],
    [2, 'incorrect_summary'],
    [2, 'none'],
    [3, 'dirty_read'],
    [3, 'incorrect_summary'],
  ],
  10: [
    [1, 'lost_update'],
    [1, 'dirty_read'],
    [1, 'none'],
    [2, 'dirty_read'],
    [2, 'none'],
    [2, 'incorrect_summary'],
    [2, 'lost_update'],
    [3, 'lost_update'],
    [3, 'incorrect_summary'],
    [3, 'none'],
  ],
};

export const SESSION_LENGTHS = [6, 8, 10] as const;
export type SessionLength = (typeof SESSION_LENGTHS)[number];

export function buildSession(length: SessionLength, rng: Rng = Math.random): Scenario[] {
  const plan = PLANS[length];
  // Dentro de um mesmo nível a ordem varia, sem subir a dificuldade antes da hora.
  const shuffled = plan.map((slot, index) => ({ slot, index, key: rng() }));
  const ordered = [...shuffled].sort((a, b) =>
    a.slot[0] !== b.slot[0] ? a.slot[0] - b.slot[0] : a.key - b.key,
  );
  return ordered.map(({ slot: [level, type] }) => {
    const template = pick(
      rng,
      TEMPLATES.filter((t) => t.level === level && t.type === type),
    );
    return { id: template.id, level: template.level, ...template.build(rng) };
  });
}

export const SCENARIO_TEMPLATES = TEMPLATES;
