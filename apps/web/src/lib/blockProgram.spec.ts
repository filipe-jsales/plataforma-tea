import { describe, expect, it } from 'vitest';
import { interpretProgram, type SerializedBlock } from './blockProgram';

describe('interpretProgram', () => {
  it('returns an empty program for no block at all', () => {
    expect(interpretProgram(null)).toEqual([]);
    expect(interpretProgram(undefined)).toEqual([]);
  });

  it('walks a simple move -> turn -> move chain via `next`', () => {
    const program: SerializedBlock = {
      type: 'move_forward',
      next: {
        block: {
          type: 'turn',
          fields: { DIR: 'RIGHT' },
          next: { block: { type: 'move_forward' } },
        },
      },
    };

    expect(interpretProgram(program)).toEqual([
      { kind: 'move' },
      { kind: 'turn', direction: 'RIGHT' },
      { kind: 'move' },
    ]);
  });

  it('defaults an unrecognized turn direction field to RIGHT', () => {
    const program: SerializedBlock = { type: 'turn', fields: {} };

    expect(interpretProgram(program)).toEqual([{ kind: 'turn', direction: 'RIGHT' }]);
  });

  it('expands repeat_times into the flattened body, repeated N times', () => {
    const program: SerializedBlock = {
      type: 'repeat_times',
      fields: { TIMES: 4 },
      inputs: {
        DO: {
          block: {
            type: 'move_forward',
            next: { block: { type: 'turn', fields: { DIR: 'RIGHT' } } },
          },
        },
      },
    };

    const actions = interpretProgram(program);

    expect(actions).toHaveLength(8);
    expect(actions).toEqual([
      { kind: 'move' },
      { kind: 'turn', direction: 'RIGHT' },
      { kind: 'move' },
      { kind: 'turn', direction: 'RIGHT' },
      { kind: 'move' },
      { kind: 'turn', direction: 'RIGHT' },
      { kind: 'move' },
      { kind: 'turn', direction: 'RIGHT' },
    ]);
  });

  it('continues the outer chain after a repeat block finishes', () => {
    const program: SerializedBlock = {
      type: 'repeat_times',
      fields: { TIMES: 2 },
      inputs: { DO: { block: { type: 'move_forward' } } },
      next: { block: { type: 'turn', fields: { DIR: 'LEFT' } } },
    };

    expect(interpretProgram(program)).toEqual([
      { kind: 'move' },
      { kind: 'move' },
      { kind: 'turn', direction: 'LEFT' },
    ]);
  });

  it('treats a repeat block with an empty body as a no-op, not a crash', () => {
    const program: SerializedBlock = { type: 'repeat_times', fields: { TIMES: 4 } };

    expect(interpretProgram(program)).toEqual([]);
  });

  it('ignores an unknown block type instead of throwing', () => {
    const program: SerializedBlock = {
      type: 'some_future_block',
      next: { block: { type: 'move_forward' } },
    };

    expect(interpretProgram(program)).toEqual([{ kind: 'move' }]);
  });

  it('caps runaway programs instead of hanging (defensive bound)', () => {
    const program: SerializedBlock = {
      type: 'repeat_times',
      fields: { TIMES: 10_000 },
      inputs: { DO: { block: { type: 'move_forward' } } },
    };

    expect(interpretProgram(program).length).toBeLessThanOrEqual(500);
  });
});
