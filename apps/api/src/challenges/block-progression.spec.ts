import { findBlockProgressionViolations } from './block-progression';

describe('findBlockProgressionViolations', () => {
  // Espelha o seed real (migrations CreateBlocks + SeedSquareChallengeToolbox):
  // "Monte o quadrado" é o primeiro (e único, no MVP) desafio, em estágio
  // "use", introduzindo os 3 blocos da paleta.
  it('passes for the real seeded content: a single "use" challenge introducing all its blocks', () => {
    const violations = findBlockProgressionViolations([
      {
        challengeId: 'monte-o-quadrado',
        stage: 'use',
        allowedBlockTypes: ['move_forward', 'turn', 'repeat_times'],
      },
    ]);

    expect(violations).toEqual([]);
  });

  it('flags a block type that debuts in a "modify" or "create" stage challenge', () => {
    const violations = findBlockProgressionViolations([
      { challengeId: 'c1', stage: 'modify', allowedBlockTypes: ['move_forward'] },
    ]);

    expect(violations).toEqual([
      { blockType: 'move_forward', challengeId: 'c1', stage: 'modify' },
    ]);
  });

  it('does not flag a block reused in a later challenge of any stage, once it debuted in "use"', () => {
    const violations = findBlockProgressionViolations([
      { challengeId: 'c1', stage: 'use', allowedBlockTypes: ['move_forward'] },
      { challengeId: 'c2', stage: 'modify', allowedBlockTypes: ['move_forward', 'turn'] },
    ]);

    // "turn" ainda debuta fora de "use" — só "move_forward" (já apresentado
    // em c1) está livre pra reaparecer em c2.
    expect(violations).toEqual([{ blockType: 'turn', challengeId: 'c2', stage: 'modify' }]);
  });

  it('only reports the first (introducing) challenge for a given block type', () => {
    const violations = findBlockProgressionViolations([
      { challengeId: 'c1', stage: 'create', allowedBlockTypes: ['repeat_times'] },
      { challengeId: 'c2', stage: 'use', allowedBlockTypes: ['repeat_times'] },
    ]);

    expect(violations).toEqual([
      { blockType: 'repeat_times', challengeId: 'c1', stage: 'create' },
    ]);
  });

  it('returns no violations for an empty challenge list', () => {
    expect(findBlockProgressionViolations([])).toEqual([]);
  });
});
