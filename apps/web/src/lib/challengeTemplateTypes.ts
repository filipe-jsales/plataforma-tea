// 4.2 — mesma forma que apps/api/src/challenge-templates/challenge-template-
// parameter.interface.ts e challenge-templates.service.ts devolvem via API.
// Duplicado aqui de propósito (mesmo padrão de ChallengeConfig/
// SerializedBlockState — não há pacote compartilhado entre as duas apps
// neste monorepo, ver challenge-config.interface.ts no backend).
export type TemplateParameterType = 'integer' | 'percentage' | 'boolean' | 'blockSelection';

export type TemplateParameterVisualPreview = 'polygonSides' | 'angleWedge' | 'toleranceGauge' | 'none';

export interface TemplateParameterOption {
  value: string;
  label: string;
}

export interface TemplateParameterDefinition {
  key: string;
  label: string;
  icon: string;
  type: TemplateParameterType;
  helpText?: string;
  min?: number;
  max?: number;
  defaultValue: number | boolean | string[];
  visualPreview: TemplateParameterVisualPreview;
  // Só presente pra 'blockSelection', já resolvido pelo backend (rótulo em
  // português do catálogo de blocos, filtrado pela regra Use-Modify-Create).
  options?: TemplateParameterOption[];
}

export interface ChallengeTemplateSummary {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
}

export interface ChallengeTemplateDetail extends ChallengeTemplateSummary {
  parameterSchema: TemplateParameterDefinition[];
}

export interface TemplateValidationError {
  parameterKey: string;
  message: string;
}

export interface TemplatePreviewGoal {
  shape: string;
  sides: number;
  turnAngleDeg: number;
}

export interface TemplatePreviewResult {
  valid: boolean;
  errors: TemplateValidationError[];
  goal: TemplatePreviewGoal | null;
}

export interface TeacherChallengeSummary {
  id: string;
  title: string;
  templateName: string;
  templateIcon: string;
  createdAt: string;
}

// 3.7 (AC4) — mesma forma que ChallengeFeedbackMessages do backend
// (challenge-config.interface.ts), mas nunca `undefined` aqui: o formulário
// (TemplateChallengeForm) precisa de um input controlado, então usa string
// vazia pra "sem valor", nunca omite a chave.
export interface ChallengeFeedbackMessagesDraft {
  retry: string;
  success: string;
}

export interface TeacherChallengeDetail {
  id: string;
  title: string;
  prompt: string;
  templateId: string;
  templateKey: string;
  params: Record<string, unknown>;
  feedbackMessages: Partial<ChallengeFeedbackMessagesDraft>;
}

// Parâmetros do formulário guiado — valores já no tipo esperado pelo
// handler (número, boolean, ou lista de blockType), nunca string crua de
// input sem coerção (ver lib/templateParameterForm.ts).
export type TemplateParamsDraft = Record<string, unknown>;
