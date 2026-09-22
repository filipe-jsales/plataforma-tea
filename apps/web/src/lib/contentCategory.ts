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

// Rótulos pro ALUNO (SubjectSelector, AppSidebar) — nunca os termos técnicos
// crus. 2026-09 — renomeados de "Matérias da escola"/"Sobre tecnologia" pra
// alinhar com o vocabulário da sidebar global (feature de header/sidebar/
// footer).
export const CONTENT_CATEGORY_STUDENT_LABEL: Record<ContentCategory, string> = {
  informatica_educacional: 'Informática na Computação',
  educacao_computacao: 'Educação em Computação',
};
