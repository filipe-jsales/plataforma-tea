import { describe, expect, it } from 'vitest';
import {
  PIECE_WEIGHT,
  ROUNDS,
  canAddToCargo,
  piecesOnBank,
  createInitialState,
  cross,
  deliveredCount,
  findConflicts,
  type PieceId,
  type RiverState,
} from './riverCrossing';

function play(state: RiverState, moves: PieceId[][]) {
  let current = state;
  let last = cross(state, []);
  for (const cargo of moves) {
    last = cross(current, cargo);
    current = last.settled;
  }
  return { state: current, last };
}

describe('findConflicts', () => {
  it('Lobo e Ovelha entram em conflito sem o Cachorro, e não com ele (R1)', () => {
    expect(findConflicts(['wolf', 'sheep']).map((r) => r.id)).toEqual(['R1']);
    expect(findConflicts(['wolf', 'sheep', 'dog'])).toEqual([]);
  });

  it('cobre R2, R3 e R4', () => {
    expect(findConflicts(['sheep', 'lettuce']).map((r) => r.id)).toEqual(['R2']);
    expect(findConflicts(['chicken', 'lettuce']).map((r) => r.id)).toEqual(['R3']);
    expect(findConflicts(['dog', 'chicken']).map((r) => r.id)).toEqual(['R4']);
  });

  it('vale para qualquer par da margem, mesmo com outras peças junto', () => {
    expect(findConflicts(['wolf', 'lettuce', 'chicken']).map((r) => r.id)).toEqual(['R3']);
  });
});

describe('deliveredCount', () => {
  it('conta só as peças que já estão na margem D, e volta a diminuir se uma peça retorna', () => {
    const start = createInitialState(2);
    expect(deliveredCount(start)).toBe(0);
    const afterFirst = cross(start, ['lettuce', 'chicken']).settled;
    expect(deliveredCount(afterFirst)).toBe(2);
    const afterReturn = cross(afterFirst, ['lettuce']).settled;
    expect(deliveredCount(afterReturn)).toBe(1);
  });

  it('uma travessia desfeita por conflito não conta como entrega', () => {
    const undone = cross(createInitialState(2), ['dog']).settled;
    expect(deliveredCount(undone)).toBe(0);
  });
});

describe('canAddToCargo', () => {
  it('aceita uma peça larga ou até duas quadradas, nunca mais que peso 2', () => {
    expect(canAddToCargo([], 'wolf')).toBe(true);
    expect(canAddToCargo(['wolf'], 'lettuce')).toBe(false);
    expect(canAddToCargo(['lettuce'], 'dog')).toBe(true);
    expect(canAddToCargo(['lettuce', 'dog'], 'chicken')).toBe(false);
  });
});

describe('cross', () => {
  it('primeiro movimento válido é só Alface + Galinha', () => {
    const start = createInitialState(2);
    const candidates: PieceId[][] = [
      [],
      ['wolf'],
      ['sheep'],
      ['lettuce'],
      ['dog'],
      ['chicken'],
      ['lettuce', 'dog'],
      ['lettuce', 'chicken'],
      ['dog', 'chicken'],
    ];
    const valid = candidates.filter((cargo) => cross(start, cargo).outcome === 'ok');
    expect(valid).toEqual([['lettuce', 'chicken']]);
  });

  it('travessia inválida é desfeita, mas a gota continua gasta', () => {
    const start = createInitialState(2);
    const result = cross(start, ['sheep']);
    expect(result.outcome).toBe('conflict');
    expect(result.settled.bank).toEqual(start.bank);
    expect(result.settled.boat).toBe('E');
    expect(result.settled.fuel).toBe(12);
    expect(result.arrived.boat).toBe('D');
  });

  it('a solução de 11 travessias do gabarito vence com 2 gotas sobrando', () => {
    const solution: PieceId[][] = [
      ['lettuce', 'chicken'],
      ['lettuce'],
      ['sheep'],
      [],
      ['wolf'],
      ['sheep'],
      ['lettuce', 'dog'],
      ['chicken'],
      ['sheep'],
      ['lettuce'],
      ['lettuce', 'chicken'],
    ];
    const { state, last } = play(createInitialState(2), solution);
    expect(last.outcome).toBe('won');
    expect(state.fuel).toBe(2);
  });

  it('esvaziar o tanque antes de terminar é perda, inclusive numa travessia desfeita', () => {
    let result = cross(createInitialState(2), []);
    for (let i = 0; i < 12; i += 1) result = cross(result.settled, []);
    expect(result.outcome).toBe('lost');
    expect(result.settled.fuel).toBe(0);

    const almostEmpty: RiverState = { ...createInitialState(2), fuel: 1 };
    expect(cross(almostEmpty, ['sheep']).outcome).toBe('lost');
  });

  it('terminar com a última gota conta como vitória, não perda', () => {
    const lastStep: RiverState = {
      round: 2,
      bank: { wolf: 'D', sheep: 'D', lettuce: 'E', dog: 'D', chicken: 'E' },
      boat: 'E',
      fuel: 1,
    };
    expect(cross(lastStep, ['lettuce', 'chicken']).outcome).toBe('won');
  });
});

describe('rodada 1 (sem o Lobo, 7 gotas)', () => {
  it('começa sem o Lobo e com 7 gotas; a rodada 2 tem todos e 13 gotas', () => {
    const r1 = createInitialState(1);
    expect(piecesOnBank(r1, 'E')).toEqual(['sheep', 'lettuce', 'dog', 'chicken']);
    expect(r1.fuel).toBe(7);
    const r2 = createInitialState(2);
    expect(piecesOnBank(r2, 'E')).toHaveLength(5);
    expect(r2.fuel).toBe(13);
  });

  it('tem exatamente dois primeiros movimentos válidos: Alface+Cachorro e Alface+Galinha', () => {
    const start = createInitialState(1);
    const valid = candidateCargos(start).filter((cargo) => cross(start, cargo).outcome === 'ok');
    expect(valid.map((c) => [...c].sort())).toEqual(
      expect.arrayContaining([['dog', 'lettuce'], ['chicken', 'lettuce']]),
    );
    expect(valid).toHaveLength(2);
  });

  it('a solução do gabarito (5 travessias) vence, e a inversa também', () => {
    const solution: PieceId[][] = [['lettuce', 'dog'], [], ['sheep'], ['lettuce'], ['lettuce', 'chicken']];
    expect(play(createInitialState(1), solution).last.outcome).toBe('won');
    const inverse: PieceId[][] = [['lettuce', 'chicken'], ['lettuce'], ['sheep'], [], ['lettuce', 'dog']];
    expect(play(createInitialState(1), inverse).last.outcome).toBe('won');
  });

  it('esvaziar as 7 gotas é fim de jogo', () => {
    let result = cross(createInitialState(1), []);
    for (let i = 0; i < 6; i += 1) result = cross(result.settled, []);
    expect(result.outcome).toBe('lost');
  });
});

function candidateCargos(state: RiverState): PieceId[][] {
  const here = piecesOnBank(state, state.boat);
  const options: PieceId[][] = [[]];
  for (const a of here) {
    if (PIECE_WEIGHT[a] <= 2) options.push([a]);
    for (const b of here) {
      if (a < b && PIECE_WEIGHT[a] + PIECE_WEIGHT[b] <= 2) options.push([a, b]);
    }
  }
  return options;
}

// Confere os números do documento por busca em largura sobre as regras reais.
function shortestSolutions(round: 1 | 2) {
  const key = (s: RiverState) =>
    ROUNDS[round].pieces.map((p) => s.bank[p]).join('') + s.boat;
  const start = createInitialState(round);
  start.fuel = 99;
  let frontier: Array<{ state: RiverState; paths: number }> = [{ state: start, paths: 1 }];
  const seen = new Map<string, number>([[key(start), 0]]);
  for (let depth = 1; depth < 30; depth += 1) {
    const next = new Map<string, { state: RiverState; paths: number }>();
    let wins = 0;
    for (const { state, paths } of frontier) {
      for (const cargo of candidateCargos(state)) {
        const r = cross(state, cargo);
        if (r.outcome === 'conflict') continue;
        if (r.outcome === 'won') {
          wins += paths;
          continue;
        }
        const k = key(r.arrived);
        if (seen.has(k)) continue;
        const entry = next.get(k);
        if (entry) entry.paths += paths;
        else next.set(k, { state: r.arrived, paths });
      }
    }
    if (wins > 0) return { length: depth, count: wins, reachable: seen.size };
    for (const k of next.keys()) seen.set(k, depth);
    frontier = [...next.values()];
  }
  return null;
}

describe('números do plano de aula, por busca exaustiva', () => {
  it('rodada 2: mínimo de 11 travessias, em exatamente duas soluções', () => {
    const result = shortestSolutions(2);
    expect(result?.length).toBe(11);
    expect(result?.count).toBe(2);
  });

  it('rodada 1: mínimo de 5 travessias, em exatamente duas soluções', () => {
    const result = shortestSolutions(1);
    expect(result?.length).toBe(5);
    expect(result?.count).toBe(2);
  });
});
