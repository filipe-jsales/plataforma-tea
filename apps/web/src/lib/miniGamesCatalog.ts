import type { ContentCategory, ContentSubcategory } from './contentCategory';

// CC1 - catálogo de mini jogos do lado do ALUNO. Continua hardcoded no
// frontend de propósito (mesma decisão já em produção antes desta feature -
// `SubjectSelector` sempre linkou "Fábrica de Pedaços Iguais" direto, sem
// buscar um catálogo do backend): não existe hoje um endpoint "liste todos
// os mini jogos disponíveis pro aluno" porque só há 1 jogo, e criar esse
// endpoint agora seria infraestrutura pra um problema que não existe ainda
// (mesmo racional de "sem sistema de template plugável... seria prematura"
// já usado 2x neste projeto). O que MUDA aqui é só a categoria carregada
// junto - permite ao SubjectSelector agrupar cada jogo na seção certa
// (Informática Educacional × Educação em Computação) sem inventar uma
// API nova. Um mini jogo novo (ex.: MJ10, "Ferramentas do Mundo do
// Trabalho") é 1 linha nova aqui, com sua própria categoria.
export interface MiniGameCatalogEntry {
  key: string;
  title: string;
  entryPath: string;
  category: ContentCategory;
  subcategory: ContentSubcategory;
  // Só em `specific_subjects`: a matéria sob a qual o jogo é listado.
  topic?: string;
}

export const MINI_GAMES_CATALOG: MiniGameCatalogEntry[] = [
  {
    key: 'fractions_equal_parts',
    title: 'Fábrica de Pedaços Iguais',
    entryPath: '/minigame/fractions/use',
    category: 'informatica_educacional',
    subcategory: 'use_modify_create',
  },
  // MJ10 - 1º conteúdo de Educação em Computação da plataforma (BNCC
  // EM13CO09) - preenche a seção que, até aqui, só mostrava o placeholder
  // "Em breve, novidades por aqui." no SubjectSelector.
  {
    key: 'digital_tools_workplace',
    title: 'Ferramentas do Mundo do Trabalho',
    entryPath: '/minigame/work-tools/use',
    category: 'educacao_computacao',
    subcategory: 'use_modify_create',
  },
  // Jogo à parte da sequência Use-Modify-Create: atividade desplugada de
  // algoritmo (repetição, decisão e verificação), sem backend nem
  // restrição sensorial, por decisão explícita do pedido.
  {
    key: 'river_crossing',
    title: 'Travessia do Rio',
    entryPath: '/minigame/river-crossing',
    category: 'educacao_computacao',
    subcategory: 'specific_subjects',
    topic: 'Algoritmos',
  },
  // Experimento de Banco de Dados II (Unidade III). Também tem rota pública
  // (/jogo/escalonador) para uso em sala sem login.
  {
    key: 'scheduler_detective',
    title: 'Detetive do Escalonador',
    entryPath: '/minigame/scheduler',
    category: 'educacao_computacao',
    subcategory: 'specific_subjects',
    topic: 'Banco de Dados',
  },
];
