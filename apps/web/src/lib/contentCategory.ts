// CC1 - mesma forma que apps/api/src/common/enums/content-category.enum.ts
// devolve via API. Duplicado aqui de propósito (mesmo padrão de
// SerializedBlockState/ChallengeConfig - não há pacote compartilhado entre
// as duas apps neste monorepo).
export type ContentCategory = 'informatica_educacional' | 'educacao_computacao';

// Rótulos pro professor/admin (área de staff - termos técnicos são
// aceitáveis aqui, regra não-negociável 9 é sobre não exigir conhecimento
// TÉCNICO de Blockly/JSON, não sobre evitar vocabulário curricular).
export const CONTENT_CATEGORY_LABEL: Record<ContentCategory, string> = {
  informatica_educacional: 'Informática Educacional',
  educacao_computacao: 'Educação em Computação',
};

// Rótulos pro ALUNO (SubjectSelector, AppSidebar) - nunca os termos técnicos
// crus. 2026-09 - renomeados de "Matérias da escola"/"Sobre tecnologia" pra
// alinhar com o vocabulário da sidebar global (feature de header/sidebar/
// footer).
export const CONTENT_CATEGORY_STUDENT_LABEL: Record<ContentCategory, string> = {
  informatica_educacional: 'Informática na Computação',
  educacao_computacao: 'Educação em Computação',
};

// Subcategoria dentro de cada categoria. `use_modify_create` é a trilha
// guiada em 3 etapas; `specific_subjects` reúne conteúdo de uma matéria
// própria (Banco de Dados, Algoritmos...), agrupado por `topic`. Rótulo do
// aluno em linguagem de aluno ("Ver, mudar e criar"), nunca os termos
// técnicos do framework (regra 3 de docs/ai/rules/coding-rule.md).
export type ContentSubcategory = 'use_modify_create' | 'specific_subjects';

export const CONTENT_SUBCATEGORY_ORDER: ContentSubcategory[] = ['use_modify_create', 'specific_subjects'];

export const CONTENT_SUBCATEGORY_STUDENT_LABEL: Record<ContentSubcategory, string> = {
  use_modify_create: 'Ver, mudar e criar',
  specific_subjects: 'Matérias específicas',
};
