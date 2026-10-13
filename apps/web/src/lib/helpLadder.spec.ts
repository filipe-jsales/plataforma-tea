import { describe, expect, it } from 'vitest';
import { buildHelpHint, HELP_LADDER_LAST_LEVEL, nextHelpLabel } from './helpLadder';

describe('helpLadder (F18)', () => {
  const goal = { sides: 5, turnAngleDeg: 72 };

  it('level 1 is a how-to hint with no numbers, so it never gives the answer away', () => {
    const hint = buildHelpHint(1, goal);

    expect(hint).not.toMatch(/\d/);
  });

  it('level 2 states the sides and the turn derived from the goal, not hand-written per challenge', () => {
    expect(buildHelpHint(2, goal)).toBe('A figura tem 5 lados, e o personagem vira 72 graus a cada lado.');
  });

  it('never uses punitive wording in any hint (regra não-negociável 4)', () => {
    const all = [buildHelpHint(1, goal), buildHelpHint(2, goal)].join(' ').toLowerCase();

    expect(all).not.toMatch(/errad|errou|falh|incorret/);
  });

  it('the button label describes what the NEXT step reveals, and disappears after the last', () => {
    expect(nextHelpLabel(0)).toBe('Ajuda: uma pista');
    expect(nextHelpLabel(1)).toBe('Ajuda: mais uma pista');
    expect(nextHelpLabel(2)).toBe('Ajuda: ver a forma');
    expect(nextHelpLabel(HELP_LADDER_LAST_LEVEL)).toBeNull();
  });

  it('the ladder has three steps and the last one is the target shape', () => {
    expect(HELP_LADDER_LAST_LEVEL).toBe(3);
  });
});
