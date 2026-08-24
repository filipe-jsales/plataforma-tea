// Mesma forma que apps/api/src/minigames devolve. Duplicado aqui de
// propósito (mesmo padrão de challengeAllocationTypes.ts — não há pacote
// compartilhado entre as duas apps neste monorepo).
export type MiniGameStage = 'use' | 'modify' | 'create';
export type FractionsFactoryTheme = 'chocolate_bar' | 'pizza' | 'garden';

export interface FractionsFactoryFraction {
  numerator: number;
  denominator: number;
}

export type FractionsFactoryCard =
  | { type: 'choose_whole' }
  | { type: 'cut_equal_parts'; parts: number }
  | { type: 'repeat_cut' }
  | { type: 'separate_pieces'; count: number }
  | { type: 'deliver_order' };

export interface FractionsFactoryLevelConfig {
  theme: FractionsFactoryTheme;
  targetFraction: FractionsFactoryFraction;
  presetSequence?: FractionsFactoryCard[];
  fractionPool?: FractionsFactoryFraction[];
}

export interface MiniGameLevelDto {
  id: string;
  conceptId: string;
  stage: MiniGameStage;
  position: number;
  title: string;
  prompt: string;
  config: FractionsFactoryLevelConfig;
}
