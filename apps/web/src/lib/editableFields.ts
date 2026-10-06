import type { SerializedBlock } from './blockProgram';

export interface EditableFieldSpec {
  blockType: string;
  fieldName: string;
}

// Anda a árvore serializada de um programa (mesmo formato de
// blockProgram.ts - encadeamento via `next`, bloco aninhado via
// `inputs.DO`) e devolve o valor atual de cada campo declarado em
// `fields` (Challenge.config.editableFields, fase Modify 3.4). Usado duas
// vezes por execução em ChallengePage: uma vez sobre `challenge.program`
// (snapshot inicial, calculado uma única vez) e uma vez sobre o bloco
// recém-serializado do workspace (valor atual) - a diferença entre as duas
// chamadas vira `changed_values` do evento `challenge_modify_attempt` (ver
// diffChangedValues abaixo). Puro: sem Blockly/DOM, testável isolado.
export function extractEditableFieldValues(
  program: SerializedBlock | null | undefined,
  fields: EditableFieldSpec[],
): Record<string, number> {
  const values: Record<string, number> = {};

  function visit(block: SerializedBlock | undefined): void {
    if (!block) return;
    for (const field of fields) {
      const rawValue = block.type === field.blockType ? block.fields?.[field.fieldName] : undefined;
      if (rawValue !== undefined) {
        values[field.fieldName] = Number(rawValue);
      }
    }
    if (block.inputs) {
      for (const input of Object.values(block.inputs)) {
        visit(input.block);
      }
    }
    visit(block.next?.block);
  }

  visit(program ?? undefined);
  return values;
}

// Só os campos que o valor atual diverge do valor inicial - um Executar sem
// nenhuma mudança (aluno só quer rever o mesmo resultado) loga `{}`, não um
// snapshot completo repetido.
export function diffChangedValues(
  initial: Record<string, number>,
  current: Record<string, number>,
): Record<string, number> {
  const changed: Record<string, number> = {};
  for (const [fieldName, value] of Object.entries(current)) {
    if (initial[fieldName] !== value) {
      changed[fieldName] = value;
    }
  }
  return changed;
}
