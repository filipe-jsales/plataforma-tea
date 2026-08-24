import type { SerializedBlockState } from './challenge-config.interface';
import {
  interpretWaterProgram,
  validateWaterProgramAgainstTestCases,
} from './water-program';

// Mesmo fixture de apps/web/src/lib/waterProgram.spec.ts — 1 conditional_if
// (limiar 100°C) com set_water_state em cada ramo.
const boilingProgram: SerializedBlockState = {
  type: 'conditional_if',
  fields: { THRESHOLD: 100 },
  inputs: {
    DO_THEN: { block: { type: 'set_water_state', fields: { STATE: 'GAS' } } },
    DO_ELSE: {
      block: { type: 'set_water_state', fields: { STATE: 'LIQUID' } },
    },
  },
};

const nestedProgram: SerializedBlockState = {
  type: 'conditional_if',
  fields: { THRESHOLD: 100 },
  inputs: {
    DO_THEN: { block: { type: 'set_water_state', fields: { STATE: 'GAS' } } },
    DO_ELSE: {
      block: {
        type: 'conditional_if',
        fields: { THRESHOLD: 0 },
        inputs: {
          DO_THEN: {
            block: { type: 'set_water_state', fields: { STATE: 'LIQUID' } },
          },
          DO_ELSE: {
            block: { type: 'set_water_state', fields: { STATE: 'SOLID' } },
          },
        },
      },
    },
  },
};

describe('interpretWaterProgram (backend port)', () => {
  it('takes the DO_THEN branch when the temperature strictly exceeds the threshold', () => {
    expect(interpretWaterProgram(boilingProgram, 120)).toBe('GAS');
  });

  it('takes the DO_ELSE branch at or below the threshold', () => {
    expect(interpretWaterProgram(boilingProgram, 100)).toBe('LIQUID');
  });

  it('returns null for an empty program, never throws', () => {
    expect(interpretWaterProgram(null, 50)).toBeNull();
    expect(interpretWaterProgram(undefined, 50)).toBeNull();
  });

  it('supports a conditional_if nested inside a branch', () => {
    expect(interpretWaterProgram(nestedProgram, 150)).toBe('GAS');
    expect(interpretWaterProgram(nestedProgram, 20)).toBe('LIQUID');
    expect(interpretWaterProgram(nestedProgram, -10)).toBe('SOLID');
  });

  it('never recurses past MAX_DEPTH on a malformed cyclic-looking tree', () => {
    // Uma árvore artificialmente profunda (não deveria existir vinda do
    // Blockly de verdade) nunca deve estourar a call stack.
    let deepest: SerializedBlockState = {
      type: 'set_water_state',
      fields: { STATE: 'GAS' },
    };
    for (let i = 0; i < 200; i += 1) {
      deepest = { type: 'set_water_state', next: { block: deepest } };
    }
    expect(() => interpretWaterProgram(deepest, 50)).not.toThrow();
  });
});

describe('validateWaterProgramAgainstTestCases (3.17)', () => {
  it('passes every case for a program that correctly covers all 3 states', () => {
    const result = validateWaterProgramAgainstTestCases(nestedProgram, [
      { temperatureC: -20, expectedState: 'SOLID' },
      { temperatureC: 20, expectedState: 'LIQUID' },
      { temperatureC: 150, expectedState: 'GAS' },
    ]);
    expect(result.allPassed).toBe(true);
    expect(result.correctCount).toBe(3);
    expect(result.totalCount).toBe(3);
    expect(result.caseResults.every((c) => c.passed)).toBe(true);
  });

  it('reports exactly which cases fail for a program that never covers SOLID (single-level conditional)', () => {
    const result = validateWaterProgramAgainstTestCases(boilingProgram, [
      { temperatureC: -20, expectedState: 'SOLID' },
      { temperatureC: 20, expectedState: 'LIQUID' },
      { temperatureC: 150, expectedState: 'GAS' },
    ]);
    expect(result.allPassed).toBe(false);
    expect(result.correctCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.caseResults).toEqual([
      {
        temperatureC: -20,
        expectedState: 'SOLID',
        actualState: 'LIQUID',
        passed: false,
      },
      {
        temperatureC: 20,
        expectedState: 'LIQUID',
        actualState: 'LIQUID',
        passed: true,
      },
      {
        temperatureC: 150,
        expectedState: 'GAS',
        actualState: 'GAS',
        passed: true,
      },
    ]);
  });

  it('never passes an empty test-case list vacuously', () => {
    expect(
      validateWaterProgramAgainstTestCases(nestedProgram, []).allPassed,
    ).toBe(false);
  });

  it('fails every case for an empty program, never throws', () => {
    const result = validateWaterProgramAgainstTestCases(null, [
      { temperatureC: 20, expectedState: 'LIQUID' },
    ]);
    expect(result.allPassed).toBe(false);
    expect(result.caseResults).toEqual([
      {
        temperatureC: 20,
        expectedState: 'LIQUID',
        actualState: null,
        passed: false,
      },
    ]);
  });
});
