import * as Blockly from 'blockly/core';
import type { WorkspaceSvg } from 'react-blockly';

export interface ToolboxBlock {
  blockType: string;
  label: string;
  colour: number;
  json: Record<string, unknown>;
}

export interface ToolboxCategory {
  slug: string;
  label: string;
  colour: number;
  blocks: ToolboxBlock[];
}

// A forma do bloco (message0/args0/...) vem inteira do catálogo do backend
// (GET /challenges/by-topic/:id) — nunca hardcodada aqui. Isso é o que
// permite um bloco novo existir só com uma linha na tabela `blocks` +
// migration, sem deploy de frontend (mesmo raciocínio de
// getIllustrationAsset ler de um mapeamento único, não espalhado pela tela).
// Idempotente: registrar de novo o mesmo blockType (ex.: remount do
// componente em StrictMode) não deveria re-disparar o warning do Blockly.
export function registerBlockDefinitions(categories: ToolboxCategory[]): void {
  const definitions = categories
    .flatMap((category) => category.blocks)
    .filter((block) => !Blockly.Blocks[block.blockType])
    .map((block) => block.json);

  if (definitions.length > 0) {
    Blockly.defineBlocksWithJsonArray(definitions);
  }
}

// AC1/AC5: só os blocos configurados pro desafio, agrupados em categorias
// pequenas e nomeadas (nunca uma paleta única enorme) — a categoria em si já
// vem pronta do backend (blocks.category), aqui só traduzimos pro formato de
// toolbox JSON que o Blockly espera.
export function buildToolboxConfiguration(
  categories: ToolboxCategory[],
): Blockly.utils.toolbox.ToolboxDefinition {
  return {
    kind: 'categoryToolbox',
    contents: categories.map((category) => ({
      kind: 'category',
      name: category.label,
      colour: String(category.colour),
      contents: category.blocks.map((block) => ({ kind: 'block', type: block.blockType })),
    })),
  } as Blockly.utils.toolbox.ToolboxDefinition;
}

const BASE_DRAG_RADIUS = 20;
const BASE_SNAP_RADIUS = 48;
const BASE_CONNECTING_SNAP_RADIUS = 48;

// AC3: tolerância ampla de encaixe (mitiga coordenação motora fina, RQ4) —
// valores bem acima do default do Blockly (~20px). Chamado uma vez no
// carregamento do módulo (`tolerancePercent` default 100 — o mesmo
// comportamento de sempre) e de novo por ChallengePage a cada desafio
// carregado (`onInject`), com `challenge.snapTolerancePercent` quando o
// desafio foi criado via template (4.2) — o professor escolhe esse valor
// no formulário guiado, nunca editando este arquivo. `Blockly.config` é
// estado global mutável do módulo Blockly (não por-workspace), por isso
// reaplicar por desafio é o suficiente: não há dois workspaces com
// tolerâncias diferentes montados ao mesmo tempo nesta tela.
export function applyGenerousSnapTolerance(tolerancePercent = 100): void {
  const scale = tolerancePercent / 100;
  Blockly.config.dragRadius = Math.round(BASE_DRAG_RADIUS * scale);
  Blockly.config.snapRadius = Math.round(BASE_SNAP_RADIUS * scale);
  Blockly.config.connectingSnapRadius = Math.round(BASE_CONNECTING_SNAP_RADIUS * scale);
}

// Motor PRIMM "Modify" (3.4/3.6, mesma forma que EditableFieldConfig do
// backend — ver challenge-config.interface.ts): um campo numérico do
// `program` pré-montado que o aluno pode editar, com os limites curados
// pra este desafio.
export interface EditableFieldConfig {
  blockType: string;
  fieldName: string;
  label: string;
  min: number;
  max: number;
}

// Trava a estrutura do programa (bloco não pode ser movido/apagado) e o
// valor de todo campo que não está em `editableFields` — só os campos
// configurados pro desafio aceitam edição, e com o min/max definidos ali
// (não o min/max técnico do bloco em si, ver migration
// AddAngleFieldToTurnBlock). Chamado uma vez no `onInject` do workspace.
// Domínio-agnóstica: usada tanto por ChallengePage (turtle) quanto por
// WaterStateChallengePage (condicionais) — o mecanismo não sabe/importa o
// que o campo representa (ângulo, número de lados, limiar de temperatura).
export function applyModifyFieldLocking(workspace: WorkspaceSvg, editableFields: EditableFieldConfig[]): void {
  for (const block of workspace.getAllBlocks(false)) {
    block.setMovable(false);
    block.setDeletable(false);

    const editableForBlock = editableFields.filter((field) => field.blockType === block.type);
    for (const input of block.inputList) {
      for (const field of input.fieldRow) {
        if (!field.name) continue;
        const spec = editableForBlock.find((candidate) => candidate.fieldName === field.name);
        if (!spec) {
          field.setEnabled(false);
          continue;
        }
        field.setEnabled(true);
        if (field instanceof Blockly.FieldNumber) {
          field.setConstraints(spec.min, spec.max, undefined);
        }
      }
    }
  }
}
