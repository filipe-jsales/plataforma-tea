import { describe, expect, it } from 'vitest';
import type { SerializedBlock } from './blockProgram';
import { evaluateWaterStatesCoverage, interpretWaterProgram } from './waterProgram';

// Mesmo programa seedado em SeedEstadosDaMateriaTopic: 1 conditional_if
// (limiar 100°C) com set_water_state em cada ramo.
const boilingProgram: SerializedBlock = {
  type: 'conditional_if',
  fields: { THRESHOLD: 100 },
  inputs: {
    DO_THEN: { block: { type: 'set_water_state', fields: { STATE: 'GAS' } } },
    DO_ELSE: { block: { type: 'set_water_state', fields: { STATE: 'LIQUID' } } },
  },
};

describe('interpretWaterProgram', () => {
  it('takes the DO_THEN branch when the temperature strictly exceeds the threshold', () => {
    expect(interpretWaterProgram(boilingProgram, 120)).toBe('GAS');
  });

  it('takes the DO_ELSE branch when the temperature is at or below the threshold ("ultrapassa" = estritamente maior)', () => {
    expect(interpretWaterProgram(boilingProgram, 100)).toBe('LIQUID');
    expect(interpretWaterProgram(boilingProgram, 20)).toBe('LIQUID');
  });

  it('returns null for an empty program (never throws)', () => {
    expect(interpretWaterProgram(null, 50)).toBeNull();
    expect(interpretWaterProgram(undefined, 50)).toBeNull();
  });

  it('returns null when no set_water_state is reachable on the taken branch', () => {
    const noAction: SerializedBlock = {
      type: 'conditional_if',
      fields: { THRESHOLD: 100 },
      inputs: {},
    };

    expect(interpretWaterProgram(noAction, 150)).toBeNull();
  });

  it('supports a conditional_if nested inside a branch (arbitrary depth, not hardcoded to 1 level)', () => {
    // SE > 100 ENTÃO gasoso SENÃO (SE > 0 ENTÃO líquido SENÃO sólido) —
    // currículo seedado hoje não usa isso, mas o intérprete generaliza.
    const nested: SerializedBlock = {
      type: 'conditional_if',
      fields: { THRESHOLD: 100 },
      inputs: {
        DO_THEN: { block: { type: 'set_water_state', fields: { STATE: 'GAS' } } },
        DO_ELSE: {
          block: {
            type: 'conditional_if',
            fields: { THRESHOLD: 0 },
            inputs: {
              DO_THEN: { block: { type: 'set_water_state', fields: { STATE: 'LIQUID' } } },
              DO_ELSE: { block: { type: 'set_water_state', fields: { STATE: 'SOLID' } } },
            },
          },
        },
      },
    };

    expect(interpretWaterProgram(nested, 150)).toBe('GAS');
    expect(interpretWaterProgram(nested, 20)).toBe('LIQUID');
    expect(interpretWaterProgram(nested, -10)).toBe('SOLID');
  });

  it('the LAST set_water_state reached along a sequential chain wins, not the first', () => {
    const sequential: SerializedBlock = {
      type: 'set_water_state',
      fields: { STATE: 'SOLID' },
      next: { block: { type: 'set_water_state', fields: { STATE: 'GAS' } } },
    };

    expect(interpretWaterProgram(sequential, 50)).toBe('GAS');
  });

  it('ignores an unknown block type instead of throwing, moving on to its `next`', () => {
    const unknown: SerializedBlock = {
      type: 'some_future_block',
      next: { block: { type: 'set_water_state', fields: { STATE: 'LIQUID' } } },
    };

    expect(interpretWaterProgram(unknown, 50)).toBe('LIQUID');
  });
});

describe('evaluateWaterStatesCoverage', () => {
  const nested: SerializedBlock = {
    type: 'conditional_if',
    fields: { THRESHOLD: 100 },
    inputs: {
      DO_THEN: { block: { type: 'set_water_state', fields: { STATE: 'GAS' } } },
      DO_ELSE: {
        block: {
          type: 'conditional_if',
          fields: { THRESHOLD: 0 },
          inputs: {
            DO_THEN: { block: { type: 'set_water_state', fields: { STATE: 'LIQUID' } } },
            DO_ELSE: { block: { type: 'set_water_state', fields: { STATE: 'SOLID' } } },
          },
        },
      },
    },
  };

  it('finds all 3 states when a nested conditional covers the whole range (3.15 AC2)', () => {
    expect(evaluateWaterStatesCoverage(nested, -20, 150)).toEqual(['SOLID', 'LIQUID', 'GAS']);
  });

  it('finds only the 2 states a single-level conditional can ever produce', () => {
    expect(evaluateWaterStatesCoverage(boilingProgram, -20, 150)).toEqual(['LIQUID', 'GAS']);
  });

  it('returns an empty list for an empty program, never throws', () => {
    expect(evaluateWaterStatesCoverage(null, -20, 150)).toEqual([]);
  });

  it('never finds a state whose branch threshold sits outside the sampled range', () => {
    // SOLID só é alcançável com temperatureC <= 0 — consultar só 10..150
    // nunca deveria "inventar" cobertura que a amostragem não confirmou.
    expect(evaluateWaterStatesCoverage(nested, 10, 150)).toEqual(['LIQUID', 'GAS']);
  });
});
