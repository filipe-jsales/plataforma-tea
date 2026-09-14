// MJ10 — mesma forma que apps/api/src/minigames/mini-game-level-config.
// interface.ts devolve via API pro jogo "Ferramentas do Mundo do Trabalho"
// (BNCC EM13CO09). Arquivo próprio, separado de miniGameLevelTypes.ts (que
// tipa `config` concretamente pro shape de frações) — evita transformar
// aquele tipo num union que `TeacherMiniGameSettings.tsx` precisaria
// discriminar por `gameKey` sem necessidade nesta entrega (isso é MJ11,
// ainda não implementada, que vai precisar disso pra configuração).
import type { ContentCategory } from './contentCategory';
import type { MiniGameStage } from './miniGameLevelTypes';

export interface WorkToolsScenario {
  id: string;
  label: string;
  icon: string;
}

export interface WorkToolsTool {
  id: string;
  label: string;
  icon: string;
}

export interface WorkToolsMatchPair {
  scenarioId: string;
  toolId: string;
}

export interface WorkToolsStatement {
  id: string;
  text: string;
  isTrue: boolean;
  explanation: string;
}

export interface WorkToolsLevelConfig {
  scenarios: WorkToolsScenario[];
  tools: WorkToolsTool[];
  correctMatches: WorkToolsMatchPair[];
  statements: WorkToolsStatement[];
  presetMatches?: WorkToolsMatchPair[];
  presetStatementAnswers?: Record<string, boolean>;
  scenarioPool?: WorkToolsScenario[];
}

export interface WorkToolsMiniGameLevelDto {
  id: string;
  conceptId: string;
  stage: MiniGameStage;
  position: number;
  title: string;
  prompt: string;
  config: WorkToolsLevelConfig;
  category: ContentCategory;
}
