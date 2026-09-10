// CC1 — classificação de catálogo, ortogonal ao motor de renderização
// (editor de blocos vs. mini jogo) e a `Topic.domain` (que só decide qual
// TELA abre). Depende do ASSUNTO ensinado, não de como é ensinado — ver
// docs/ai/backlog/categorizacao-informatica-educacional-x-educacao-computacao.md.
export enum ContentCategory {
  // O computador/software é recurso pra ensinar uma disciplina da educação
  // básica (Matemática, Ciências etc.) — hoje `angulos_formas`,
  // `water_state` e "Fábrica de Pedaços Iguais".
  INFORMATICA_EDUCACIONAL = 'informatica_educacional',
  // O conteúdo é a própria tecnologia — pensamento computacional,
  // ferramentas/hardware digitais, letramento — ex.: "Ferramentas do Mundo
  // do Trabalho" (BNCC EM13CO09).
  EDUCACAO_COMPUTACAO = 'educacao_computacao',
}
