import { BadRequestException } from '@nestjs/common';
import { FractionsFactoryValidator } from './fractions-factory.validator';

describe('FractionsFactoryValidator', () => {
  const validator = new FractionsFactoryValidator();

  it('exposes its gameKey', () => {
    expect(validator.gameKey).toBe('fractions_factory');
  });

  it('rejects an invalid theme with a descriptive message', () => {
    expect(() => validator.applyUpdate({}, { theme: 'space' })).toThrow(BadRequestException);
  });

  it('rejects a target fraction with denominator outside 2-8', () => {
    expect(() =>
      validator.applyUpdate({}, { targetFraction: { numerator: 1, denominator: 12 } }),
    ).toThrow(BadRequestException);
  });

  it('rejects a numerator equal to the denominator', () => {
    expect(() =>
      validator.applyUpdate({}, { targetFraction: { numerator: 4, denominator: 4 } }),
    ).toThrow(BadRequestException);
  });

  it('rejects an empty fraction pool', () => {
    expect(() => validator.applyUpdate({}, { fractionPool: [] })).toThrow(BadRequestException);
  });

  it('rejects a fraction pool with more than 5 options', () => {
    const pool = Array.from({ length: 6 }, (_, i) => ({ numerator: 1, denominator: 2 + i }));
    expect(() => validator.applyUpdate({}, { fractionPool: pool })).toThrow(BadRequestException);
  });

  it('rejects a fraction pool with any invalid fraction', () => {
    expect(() =>
      validator.applyUpdate({}, { fractionPool: [{ numerator: 1, denominator: 2 }, { numerator: 4, denominator: 4 }] }),
    ).toThrow(BadRequestException);
  });

  it('merges valid fields into config, preserving untouched fields', () => {
    const current = { theme: 'pizza', targetFraction: { numerator: 1, denominator: 4 } };

    const result = validator.applyUpdate(current, { theme: 'chocolate_bar' });

    expect(result).toEqual({
      theme: 'chocolate_bar',
      targetFraction: { numerator: 1, denominator: 4 },
    });
  });

  it('accepts a valid fraction pool and replaces it entirely', () => {
    const current = { theme: 'garden', targetFraction: { numerator: 3, denominator: 4 }, fractionPool: [] };

    const result = validator.applyUpdate(current, {
      fractionPool: [{ numerator: 1, denominator: 2 }],
    });

    expect(result).toEqual({
      theme: 'garden',
      targetFraction: { numerator: 3, denominator: 4 },
      fractionPool: [{ numerator: 1, denominator: 2 }],
    });
  });
});
