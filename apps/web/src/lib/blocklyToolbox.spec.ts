import * as Blockly from 'blockly/core';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildToolboxConfiguration,
  registerBlockDefinitions,
  type ToolboxCategory,
} from './blocklyToolbox';

const categories: ToolboxCategory[] = [
  {
    slug: 'movimento',
    label: 'Movimento',
    colour: 200,
    blocks: [
      {
        blockType: 'test_move_forward',
        label: 'mover para frente',
        colour: 200,
        json: { type: 'test_move_forward', message0: 'mover', previousStatement: null, nextStatement: null },
      },
      {
        blockType: 'test_turn',
        label: 'girar',
        colour: 200,
        json: { type: 'test_turn', message0: 'girar', previousStatement: null, nextStatement: null },
      },
    ],
  },
  {
    slug: 'controle',
    label: 'Controle',
    colour: 290,
    blocks: [
      {
        blockType: 'test_repeat_times',
        label: 'repetir',
        colour: 290,
        json: { type: 'test_repeat_times', message0: 'repetir', previousStatement: null, nextStatement: null },
      },
    ],
  },
];

describe('buildToolboxConfiguration', () => {
  it('emits one named category per group, never a single flat block list (AC5)', () => {
    const toolbox = buildToolboxConfiguration(categories) as {
      kind: string;
      contents: Array<{ kind: string; name: string; contents: Array<{ kind: string; type: string }> }>;
    };

    expect(toolbox.kind).toBe('categoryToolbox');
    expect(toolbox.contents).toHaveLength(2);
    expect(toolbox.contents[0]).toMatchObject({
      kind: 'category',
      name: 'Movimento',
      contents: [
        { kind: 'block', type: 'test_move_forward' },
        { kind: 'block', type: 'test_turn' },
      ],
    });
    expect(toolbox.contents[1]).toMatchObject({
      kind: 'category',
      name: 'Controle',
      contents: [{ kind: 'block', type: 'test_repeat_times' }],
    });
  });

  it('only ever includes the block types passed in — never the full built-in Blockly palette', () => {
    const toolbox = buildToolboxConfiguration(categories) as {
      contents: Array<{ contents: Array<{ type: string }> }>;
    };

    const allTypes = toolbox.contents.flatMap((category) => category.contents.map((c) => c.type));
    expect(allTypes.sort()).toEqual(['test_move_forward', 'test_repeat_times', 'test_turn'].sort());
  });
});

describe('registerBlockDefinitions', () => {
  beforeEach(() => {
    delete (Blockly.Blocks as Record<string, unknown>).test_move_forward;
    delete (Blockly.Blocks as Record<string, unknown>).test_turn;
    delete (Blockly.Blocks as Record<string, unknown>).test_repeat_times;
  });

  it('registers every block type from the catalog with Blockly', () => {
    registerBlockDefinitions(categories);

    expect(Blockly.Blocks.test_move_forward).toBeDefined();
    expect(Blockly.Blocks.test_turn).toBeDefined();
    expect(Blockly.Blocks.test_repeat_times).toBeDefined();
  });

  it('is idempotent — calling it again does not throw or double-register', () => {
    registerBlockDefinitions(categories);

    expect(() => registerBlockDefinitions(categories)).not.toThrow();
  });
});
