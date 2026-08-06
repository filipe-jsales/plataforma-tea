// Formato esperado de Challenge.config (jsonb livre no banco, tipado aqui só
// no código de aplicação). "stage" é o estágio Use-Modify-Create em que o
// desafio está — ver regra não-negociável 2 e block-progression.ts, que
// valida que nenhum blockType apareça pela primeira vez fora do estágio
// "use".
export type ChallengeStage = 'use' | 'modify' | 'create';

export interface SquareGoalConfig {
  shape: 'square';
  sides: number;
  turnAngleDeg: number;
}

export interface ChallengeConfig {
  stage: ChallengeStage;
  allowedBlockTypes: string[];
  goal: SquareGoalConfig;
}

export function isChallengeConfig(value: unknown): value is ChallengeConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const config = value as Partial<ChallengeConfig>;
  return (
    typeof config.stage === 'string' &&
    Array.isArray(config.allowedBlockTypes) &&
    config.allowedBlockTypes.every((type) => typeof type === 'string') &&
    typeof config.goal === 'object' &&
    config.goal !== null
  );
}
