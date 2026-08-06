import { generateJoinCode } from './join-code';

describe('generateJoinCode', () => {
  it('produces a "PALAVRA-digito" code using only the known word list and a 1-9 digit', () => {
    const knownWords = [
      'AZUL',
      'VERDE',
      'ROXO',
      'ROSA',
      'LARANJA',
      'AMARELO',
      'PRETO',
      'BRANCO',
      'MARROM',
      'CINZA',
    ];

    for (let i = 0; i < 50; i += 1) {
      const code = generateJoinCode();
      const [word, digit] = code.split('-');

      expect(knownWords).toContain(word);
      expect(digit).toMatch(/^[1-9]$/);
    }
  });

  it('does not guarantee uniqueness across successive calls (documented behavior)', () => {
    // Regression guard for the documented tradeoff in join-code.ts: this is a
    // smoke test that the function is deterministic in shape, not a
    // uniqueness guarantee (the DB unique constraint owns that).
    expect(generateJoinCode()).toMatch(/^[A-Z]+-[1-9]$/);
  });
});
