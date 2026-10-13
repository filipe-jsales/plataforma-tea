import { describe, expect, it } from 'vitest';
import {
  canAddToCargo,
  createInitialState,
  cross,
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
    const start = createInitialState();
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
    const start = createInitialState();
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
    const { state, last } = play(createInitialState(), solution);
    expect(last.outcome).toBe('won');
    expect(state.fuel).toBe(2);
  });

  it('esvaziar o tanque antes de terminar é perda, inclusive numa travessia desfeita', () => {
    let result = cross(createInitialState(), []);
    for (let i = 0; i < 12; i += 1) result = cross(result.settled, []);
    expect(result.outcome).toBe('lost');
    expect(result.settled.fuel).toBe(0);

    const almostEmpty: RiverState = { ...createInitialState(), fuel: 1 };
    expect(cross(almostEmpty, ['sheep']).outcome).toBe('lost');
  });

  it('terminar com a última gota conta como vitória, não perda', () => {
    const lastStep: RiverState = {
      bank: { wolf: 'D', sheep: 'D', lettuce: 'E', dog: 'D', chicken: 'E' },
      boat: 'E',
      fuel: 1,
    };
    expect(cross(lastStep, ['lettuce', 'chicken']).outcome).toBe('won');
  });
});
