import { describe, expect, it } from 'vitest';
import { matchesTarget, simulateSequence, type FractionsFactoryCard } from './fractionsFactory';

const VALID_HALF: FractionsFactoryCard[] = [
  { type: 'choose_whole' },
  { type: 'cut_equal_parts', parts: 2 },
  { type: 'separate_pieces', count: 1 },
  { type: 'deliver_order' },
];

describe('simulateSequence', () => {
  it('validates a correct sequence and computes totalParts/deliveredParts', () => {
    const result = simulateSequence(VALID_HALF);

    expect(result.valid).toBe(true);
    expect(result.totalParts).toBe(2);
    expect(result.deliveredParts).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it('returns a descriptive error for an empty sequence, never throws', () => {
    const result = simulateSequence([]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/vazia/);
  });

  it('flags a missing "Entregar pedido" as the last card', () => {
    const result = simulateSequence([
      { type: 'choose_whole' },
      { type: 'cut_equal_parts', parts: 4 },
      { type: 'separate_pieces', count: 1 },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Entregar pedido'))).toBe(true);
  });

  it('flags "Cortar em partes iguais" out of order (before "Escolher o inteiro")', () => {
    const result = simulateSequence([
      { type: 'cut_equal_parts', parts: 4 },
      { type: 'choose_whole' },
      { type: 'separate_pieces', count: 1 },
      { type: 'deliver_order' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('escolher o inteiro'))).toBe(true);
  });

  it('flags a denominator outside 2-8', () => {
    const result = simulateSequence([
      { type: 'choose_whole' },
      { type: 'cut_equal_parts', parts: 12 },
      { type: 'separate_pieces', count: 1 },
      { type: 'deliver_order' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.totalParts).toBeNull();
  });

  it('"repeat_cut" is optional and never affects totalParts/deliveredParts, only counted separately', () => {
    const withRepeat = simulateSequence([
      { type: 'choose_whole' },
      { type: 'cut_equal_parts', parts: 4 },
      { type: 'repeat_cut' },
      { type: 'repeat_cut' },
      { type: 'separate_pieces', count: 3 },
      { type: 'deliver_order' },
    ]);

    expect(withRepeat.valid).toBe(true);
    expect(withRepeat.totalParts).toBe(4);
    expect(withRepeat.deliveredParts).toBe(3);
    expect(withRepeat.repeatCutCount).toBe(2);
  });

  it('a sequence with no repeat_cut at all is still valid (repeat_cut is never required to match)', () => {
    const result = simulateSequence(VALID_HALF);

    expect(result.valid).toBe(true);
    expect(result.repeatCutCount).toBe(0);
  });
});

describe('matchesTarget', () => {
  it('matches when the simulated result equals the target fraction exactly', () => {
    const result = simulateSequence(VALID_HALF);

    expect(matchesTarget(result, { numerator: 1, denominator: 2 })).toBe(true);
  });

  it('does not match when the denominator differs, even if valid', () => {
    const result = simulateSequence(VALID_HALF);

    expect(matchesTarget(result, { numerator: 1, denominator: 4 })).toBe(false);
  });

  it('never matches an invalid sequence, regardless of the numbers involved', () => {
    const result = simulateSequence([]);

    expect(matchesTarget(result, { numerator: 1, denominator: 2 })).toBe(false);
  });
});
