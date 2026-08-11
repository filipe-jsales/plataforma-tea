import * as Blockly from 'blockly/core';
import type { WorkspaceSvg } from 'react-blockly';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyGenerousSnapTolerance,
  applyModifyFieldLocking,
  buildToolboxConfiguration,
  registerBlockDefinitions,
  type ToolboxCategory,
} from './blocklyToolbox';

// Testes deste describe usam um Blockly.Workspace headless de verdade (sem
// SVG/DOM) — o suficiente pra exercitar isMovable/getField/setConstraints,
// que não dependem de renderização. `applyModifyFieldLocking` só declara
// `WorkspaceSvg` na assinatura porque é o tipo que react-blockly entrega em
// produção (ver onInject em ChallengePage/WaterStateChallengePage); o cast
// aqui é só pra satisfazer esse tipo mais amplo em teste, nunca usado fora
// de teste.
function asWorkspaceSvg(workspace: Blockly.Workspace): WorkspaceSvg {
  return workspace as unknown as WorkspaceSvg;
}

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

describe('applyGenerousSnapTolerance', () => {
  it('defaults to 100% — the same generous tolerance every curriculum challenge already had', () => {
    applyGenerousSnapTolerance();

    expect(Blockly.config.dragRadius).toBe(20);
    expect(Blockly.config.snapRadius).toBe(48);
    expect(Blockly.config.connectingSnapRadius).toBe(48);
  });

  it('4.2 — scales tolerance down proportionally for a teacher-chosen percent below 100', () => {
    applyGenerousSnapTolerance(60);

    expect(Blockly.config.dragRadius).toBe(12);
    expect(Blockly.config.snapRadius).toBe(29);
    expect(Blockly.config.connectingSnapRadius).toBe(29);
  });

  it('never collapses to zero tolerance even at the lowest valid percent (10%)', () => {
    applyGenerousSnapTolerance(10);

    expect(Blockly.config.dragRadius).toBeGreaterThan(0);
    expect(Blockly.config.snapRadius).toBeGreaterThan(0);
    expect(Blockly.config.connectingSnapRadius).toBeGreaterThan(0);
  });
});

// Extraída de ChallengePage.tsx (era local/não-exportada) pra ser
// reaproveitada por WaterStateChallengePage — domínio-agnóstica de
// propósito, então os testes aqui usam um bloco de teste genérico, nunca
// um bloco real de tartaruga/condicional.
describe('applyModifyFieldLocking', () => {
  beforeEach(() => {
    delete (Blockly.Blocks as Record<string, unknown>).test_lockable;
    Blockly.defineBlocksWithJsonArray([
      {
        type: 'test_lockable',
        message0: 'valor %1',
        args0: [{ type: 'field_number', name: 'VALUE', value: 10 }],
        previousStatement: null,
        nextStatement: null,
      },
    ]);
  });

  it('locks structure (not movable/deletable) for every block, regardless of domain', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('test_lockable');

    applyModifyFieldLocking(asWorkspaceSvg(workspace), []);

    expect(block.isMovable()).toBe(false);
    expect(block.isDeletable()).toBe(false);
  });

  it('disables every field not listed in editableFields', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('test_lockable');

    applyModifyFieldLocking(asWorkspaceSvg(workspace), []);

    expect(block.getField('VALUE')?.isEnabled()).toBe(false);
  });

  it('enables and constrains only the fields declared in editableFields, matched by blockType+fieldName', () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('test_lockable');

    applyModifyFieldLocking(asWorkspaceSvg(workspace), [
      { blockType: 'test_lockable', fieldName: 'VALUE', label: 'Valor', min: 1, max: 5 },
    ]);

    const field = block.getField('VALUE') as Blockly.FieldNumber;
    expect(field.isEnabled()).toBe(true);
    expect(field.getMin()).toBe(1);
    expect(field.getMax()).toBe(5);
  });

  it("leaves a field disabled when editableFields names it for a DIFFERENT blockType", () => {
    const workspace = new Blockly.Workspace();
    const block = workspace.newBlock('test_lockable');

    applyModifyFieldLocking(asWorkspaceSvg(workspace), [
      { blockType: 'some_other_block', fieldName: 'VALUE', label: 'Valor', min: 1, max: 5 },
    ]);

    expect(block.getField('VALUE')?.isEnabled()).toBe(false);
  });
});
