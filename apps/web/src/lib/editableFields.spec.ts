import { describe, expect, it } from 'vitest';
import type { SerializedBlock } from './blockProgram';
import { diffChangedValues, extractEditableFieldValues } from './editableFields';

const fields = [
  { blockType: 'repeat_times', fieldName: 'TIMES' },
  { blockType: 'turn', fieldName: 'ANGLE' },
];

const modifyProgram: SerializedBlock = {
  type: 'repeat_times',
  fields: { TIMES: 4 },
  inputs: {
    DO: {
      block: {
        type: 'move_forward',
        next: { block: { type: 'turn', fields: { DIR: 'RIGHT', ANGLE: 90 } } },
      },
    },
  },
};

describe('extractEditableFieldValues', () => {
  it('returns null/empty for no program at all', () => {
    expect(extractEditableFieldValues(null, fields)).toEqual({});
    expect(extractEditableFieldValues(undefined, fields)).toEqual({});
  });

  it('walks the whole tree (top block, nested DO input, next chain) collecting every declared field', () => {
    expect(extractEditableFieldValues(modifyProgram, fields)).toEqual({ TIMES: 4, ANGLE: 90 });
  });

  it('omits a declared field whose block never appears in the program', () => {
    const onlyRepeat: SerializedBlock = { type: 'repeat_times', fields: { TIMES: 5 } };

    expect(extractEditableFieldValues(onlyRepeat, fields)).toEqual({ TIMES: 5 });
  });

  it('ignores fields not declared as editable, even if present on the block', () => {
    const withExtraField: SerializedBlock = {
      type: 'turn',
      fields: { DIR: 'LEFT', ANGLE: 60, EXTRA: 'x' as unknown as number },
    };

    expect(extractEditableFieldValues(withExtraField, [{ blockType: 'turn', fieldName: 'ANGLE' }])).toEqual({
      ANGLE: 60,
    });
  });
});

describe('diffChangedValues', () => {
  it('returns {} when nothing changed', () => {
    expect(diffChangedValues({ TIMES: 4, ANGLE: 90 }, { TIMES: 4, ANGLE: 90 })).toEqual({});
  });

  it('includes only the fields whose value actually diverged', () => {
    expect(diffChangedValues({ TIMES: 4, ANGLE: 90 }, { TIMES: 5, ANGLE: 90 })).toEqual({ TIMES: 5 });
  });

  it('includes every field that changed when more than one did', () => {
    expect(diffChangedValues({ TIMES: 4, ANGLE: 90 }, { TIMES: 3, ANGLE: 120 })).toEqual({
      TIMES: 3,
      ANGLE: 120,
    });
  });
});
