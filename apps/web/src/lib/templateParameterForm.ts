import type {
  TemplateParameterDefinition,
  TemplateParamsDraft,
  TemplateValidationError,
} from './challengeTemplateTypes';

// 4.2 - funções puras que sustentam o formulário guiado genérico
// (TemplateChallengeForm.tsx): construir o rascunho inicial a partir do
// schema, coagir o valor bruto de um input pro tipo certo, e indexar erros
// de validação por campo. Nenhuma delas conhece "polígono"/"ângulo" - um
// template novo (geometria ou outra disciplina) funciona aqui sem tocar
// neste arquivo, contanto que reuse um `TemplateParameterType` já suportado.
// `savedParams` (opcional) é o `templateParams` de um desafio já existente
// (edição/duplicação) - usado CAMPO A CAMPO, nunca o objeto inteiro no lugar
// do draft: um parâmetro adicionado ao template DEPOIS que o desafio foi
// salvo (ex.: `closureTolerancePx`/`blockSize`, ver migrations
// AddClosureToleranceToRegularPolygonTemplate/AddBlockSizeToRegularPolygon-
// Template) fica ausente em `savedParams`, e sem este merge o campo nascia
// `undefined` - `Number(undefined)` é `NaN`, que o React repassa cru pro
// DOM (`<input type="number" value={NaN}>`), gerando o warning do browser
// "The specified value "NaN" cannot be parsed" e um campo em branco que
// parecia bug, não "parâmetro novo sem valor salvo ainda".
export function buildInitialParams(
  parameterSchema: TemplateParameterDefinition[],
  savedParams?: TemplateParamsDraft,
): TemplateParamsDraft {
  const draft: TemplateParamsDraft = {};
  for (const param of parameterSchema) {
    const saved = savedParams?.[param.key];
    draft[param.key] = saved !== undefined ? saved : param.defaultValue;
  }
  return draft;
}

// Um input numérico nativo entrega string - nunca gravamos string crua no
// rascunho (o preview/validate manda o valor pro backend, que espera
// número/boolean/array já no tipo certo).
export function coerceParameterValue(
  type: TemplateParameterDefinition['type'],
  rawValue: string | boolean | string[],
): number | boolean | string | string[] {
  if (type === 'integer' || type === 'percentage') {
    const num = Number(rawValue);
    return Number.isFinite(num) ? num : 0;
  }
  if (type === 'boolean') {
    return Boolean(rawValue);
  }
  if (type === 'select') {
    return typeof rawValue === 'string' ? rawValue : '';
  }
  return Array.isArray(rawValue) ? rawValue : [];
}

// AC3 - cada erro fica anexado embaixo do campo certo. Uma mensagem por
// campo (a primeira do handler) - o formulário nunca empilha duas
// mensagens no mesmo lugar; se o handler devolver mais de uma pro mesmo
// parâmetro (não acontece hoje, mas o tipo permite), só a primeira aparece.
export function errorsByParameterKey(errors: TemplateValidationError[]): Record<string, string> {
  const byKey: Record<string, string> = {};
  for (const error of errors) {
    if (!byKey[error.parameterKey]) {
      byKey[error.parameterKey] = error.message;
    }
  }
  return byKey;
}

export function toggleBlockType(current: unknown, blockType: string, enabled: boolean): string[] {
  const list = Array.isArray(current) ? (current as string[]) : [];
  if (enabled) {
    return list.includes(blockType) ? list : [...list, blockType];
  }
  return list.filter((type) => type !== blockType);
}
