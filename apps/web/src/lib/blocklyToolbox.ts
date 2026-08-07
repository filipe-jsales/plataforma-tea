import * as Blockly from 'blockly/core';

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
