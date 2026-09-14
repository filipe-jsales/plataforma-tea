// CC1 — mesma forma que apps/api/src/common/enums/content-category.enum.ts
// devolve via API. Duplicado aqui de propósito (mesmo padrão de
// SerializedBlockState/ChallengeConfig — não há pacote compartilhado entre
// as duas apps neste monorepo).
export type ContentCategory = 'informatica_educacional' | 'educacao_computacao';

// Rótulos pro professor/admin (área de staff — termos técnicos são
// aceitáveis aqui, regra não-negociável 9 é sobre não exigir conhecimento
// TÉCNICO de Blockly/JSON, não sobre evitar vocabulário curricular).
export const CONTENT_CATEGORY_LABEL: Record<ContentCategory, string> = {
  informatica_educacional: 'Informática Educacional',
  educacao_computacao: 'Educação em Computação',
};

// Rótulos pro ALUNO (SubjectSelector) — nunca os termos técnicos crus.
export const CONTENT_CATEGORY_STUDENT_LABEL: Record<ContentCategory, string> = {
  informatica_educacional: 'Matérias da escola',
  educacao_computacao: 'Sobre tecnologia',
};
