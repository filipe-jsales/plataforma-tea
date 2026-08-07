// 4.2 — vocabulário genérico de parâmetro de template, pensado pra crescer
// sem exigir tela nova a cada template cadastrado (ver nota de pesquisa
// completa em challenge-templates.service.ts). O frontend renderiza CADA
// campo só a partir de `type`/`visualPreview` — nunca por nome de parâmetro
// hardcoded — então um template novo (geometria ou outra disciplina) ganha
// formulário funcionando só cadastrando a definição, sem componente novo,
// contanto que reaproveite um `type`/`visualPreview` já suportado.
export type TemplateParameterType = 'integer' | 'percentage' | 'boolean' | 'blockSelection';

// Qual miniatura inline mostrar junto ao campo (AC2 — "exemplo visual do
// efeito daquele parâmetro"). 'none' pra parâmetros autoexplicativos (ex.:
// a própria lista de blocos já é visual). Um tipo de preview novo == um
// componente novo em components/template-form/, nunca lógica condicional
// por nome de parâmetro no formulário genérico.
export type TemplateParameterVisualPreview =
  | 'polygonSides'
  | 'angleWedge'
  | 'toleranceGauge'
  | 'none';

export interface TemplateParameterOption {
  value: string;
  label: string;
}

export interface TemplateParameterDefinition {
  // Chave usada tanto no payload de parâmetros (`params[key]`) quanto pelo
  // handler do template pra ler o valor — nunca exposta como "nome técnico
  // do bloco Blockly" (regra não-negociável 9), sempre um conceito
  // pedagógico (ex.: "sides", não "polygon_block_arg_0").
  key: string;
  // Rótulo em português simples — sempre acompanhado de `icon` na tela
  // (AC2, rotulagem redundante ícone+texto).
  label: string;
  icon: string;
  type: TemplateParameterType;
  helpText?: string;
  // Só pra 'integer'/'percentage'.
  min?: number;
  max?: number;
  defaultValue: number | boolean | string[];
  visualPreview: TemplateParameterVisualPreview;
  // Só pra 'blockSelection': candidatos cadastrados no template. A lista
  // efetivamente oferecida ao professor (`options`, resolvida em
  // ChallengeTemplatesService.getTemplateDetail) é filtrada em runtime pelos
  // blocos já introduzidos num desafio `stage: 'use'` do mesmo tópico — a
  // regra de progressão Use-Modify-Create (coding-rule.md) vale também pro
  // desafio criado pelo professor, não só pro currículo semeado.
  candidateBlockTypes?: string[];
}

// Versão resolvida em runtime, devolvida por GET /challenge-templates/:id —
// `options` só existe pra 'blockSelection', já filtrada e traduzida (label
// em português vindo do catálogo `blocks`, nunca o `blockType` cru como
// rótulo).
export interface ResolvedTemplateParameterDefinition extends TemplateParameterDefinition {
  options?: TemplateParameterOption[];
}
