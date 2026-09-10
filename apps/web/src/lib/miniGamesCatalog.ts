import type { ContentCategory } from './contentCategory';

// CC1 — catálogo de mini jogos do lado do ALUNO. Continua hardcoded no
// frontend de propósito (mesma decisão já em produção antes desta feature —
// `SubjectSelector` sempre linkou "Fábrica de Pedaços Iguais" direto, sem
// buscar um catálogo do backend): não existe hoje um endpoint "liste todos
// os mini jogos disponíveis pro aluno" porque só há 1 jogo, e criar esse
// endpoint agora seria infraestrutura pra um problema que não existe ainda
// (mesmo racional de "sem sistema de template plugável... seria prematura"
// já usado 2x neste projeto). O que MUDA aqui é só a categoria carregada
// junto — permite ao SubjectSelector agrupar cada jogo na seção certa
// (Informática Educacional × Educação em Computação) sem inventar uma
// API nova. Um mini jogo novo (ex.: MJ10, "Ferramentas do Mundo do
// Trabalho") é 1 linha nova aqui, com sua própria categoria.
export interface MiniGameCatalogEntry {
  key: string;
  title: string;
  entryPath: string;
  category: ContentCategory;
}

export const MINI_GAMES_CATALOG: MiniGameCatalogEntry[] = [
  {
    key: 'fractions_equal_parts',
    title: 'Fábrica de Pedaços Iguais',
    entryPath: '/minigame/fractions/use',
    category: 'informatica_educacional',
  },
];
