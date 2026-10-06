import { describe, expect, it } from 'vitest';
import type { TemplateParameterDefinition } from './challengeTemplateTypes';
import {
  buildInitialParams,
  coerceParameterValue,
  errorsByParameterKey,
  toggleBlockType,
} from './templateParameterForm';

const schema: TemplateParameterDefinition[] = [
  { key: 'sides', label: 'Lados', icon: '🔺', type: 'integer', min: 3, max: 12, defaultValue: 4, visualPreview: 'polygonSides' },
  {
    key: 'enabledBlockTypes',
    label: 'Blocos',
    icon: '🧩',
    type: 'blockSelection',
    defaultValue: ['move_forward', 'turn'],
    visualPreview: 'none',
  },
];

describe('buildInitialParams', () => {
  it('seeds the draft with every parameter default - new templates work without bespoke prefill code', () => {
    expect(buildInitialParams(schema)).toEqual({ sides: 4, enabledBlockTypes: ['move_forward', 'turn'] });
  });

  it('returns an empty draft for a template with no parameters', () => {
    expect(buildInitialParams([])).toEqual({});
  });

  it('uses the saved value per key when editing/duplicating an existing challenge', () => {
    expect(buildInitialParams(schema, { sides: 6, enabledBlockTypes: ['move_forward'] })).toEqual({
      sides: 6,
      enabledBlockTypes: ['move_forward'],
    });
  });

  it('falls back to the schema default for a key missing from savedParams - a template parameter added after the challenge was saved (ex.: closureTolerancePx/blockSize) never lands as undefined/NaN', () => {
    expect(buildInitialParams(schema, { sides: 6 })).toEqual({
      sides: 6,
      enabledBlockTypes: ['move_forward', 'turn'],
    });
  });
});

describe('coerceParameterValue', () => {
  it('converts a raw numeric input string to a number for integer/percentage types', () => {
    expect(coerceParameterValue('integer', '6')).toBe(6);
    expect(coerceParameterValue('percentage', '60')).toBe(60);
  });

  it('falls back to 0 for a non-numeric raw value, never NaN leaking into the draft', () => {
    expect(coerceParameterValue('integer', 'abc')).toBe(0);
  });

  it('coerces boolean type', () => {
    expect(coerceParameterValue('boolean', true)).toBe(true);
    expect(coerceParameterValue('boolean', '')).toBe(false);
  });

  it('keeps blockSelection as an array, defaulting to empty for a non-array value', () => {
    expect(coerceParameterValue('blockSelection', ['move_forward'])).toEqual(['move_forward']);
    expect(coerceParameterValue('blockSelection', 'oops')).toEqual([]);
  });

  it('keeps select as the raw string, defaulting to empty string for a non-string value', () => {
    expect(coerceParameterValue('select', 'large')).toBe('large');
    expect(coerceParameterValue('select', true)).toBe('');
  });
});

describe('errorsByParameterKey', () => {
  it('AC3 - indexes each error under its own field, so the message renders inline under the right input', () => {
    const result = errorsByParameterKey([
      { parameterKey: 'sides', message: 'Escolha um número de lados entre 3 e 12.' },
      { parameterKey: 'snapTolerancePercent', message: 'A tolerância não pode ficar em 0%.' },
    ]);

    expect(result).toEqual({
      sides: 'Escolha um número de lados entre 3 e 12.',
      snapTolerancePercent: 'A tolerância não pode ficar em 0%.',
    });
  });

  it('keeps only the first message when the same field has more than one error', () => {
    const result = errorsByParameterKey([
      { parameterKey: 'turnAngleDeg', message: 'primeira mensagem' },
      { parameterKey: 'turnAngleDeg', message: 'segunda mensagem' },
    ]);

    expect(result).toEqual({ turnAngleDeg: 'primeira mensagem' });
  });

  it('returns an empty map for a valid (error-free) result', () => {
    expect(errorsByParameterKey([])).toEqual({});
  });
});

describe('toggleBlockType', () => {
  it('adds a block type when enabled and not yet present', () => {
    expect(toggleBlockType(['move_forward'], 'turn', true)).toEqual(['move_forward', 'turn']);
  });

  it('does not duplicate a block type already present', () => {
    expect(toggleBlockType(['move_forward', 'turn'], 'turn', true)).toEqual(['move_forward', 'turn']);
  });

  it('removes a block type when disabled', () => {
    expect(toggleBlockType(['move_forward', 'turn'], 'turn', false)).toEqual(['move_forward']);
  });

  it('treats a non-array current value as an empty list, never throwing', () => {
    expect(toggleBlockType(undefined, 'turn', true)).toEqual(['turn']);
  });
});
