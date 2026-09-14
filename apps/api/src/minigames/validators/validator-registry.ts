import type { MiniGameKey } from '../mini-game-level-config.interface';
import { FractionsFactoryValidator } from './fractions-factory.validator';
import type { MiniGameLevelValidator } from './mini-game-level-validator.interface';

// MJ9 — único lugar que precisa mudar pra cadastrar um jogo novo (além da
// linha de catálogo com o `gameKey` correspondente, curada via seed): uma
// classe implementando `MiniGameLevelValidator` + uma entrada aqui. Nenhum
// outro arquivo deste módulo (service/controller) muda — mesmo compromisso
// já feito em `challenge-templates/handlers/template-registry.ts`.
const VALIDATORS: MiniGameLevelValidator[] = [new FractionsFactoryValidator()];

const VALIDATORS_BY_KEY = new Map(
  VALIDATORS.map((validator) => [validator.gameKey, validator]),
);

export function getMiniGameLevelValidator(
  gameKey: MiniGameKey,
): MiniGameLevelValidator | undefined {
  return VALIDATORS_BY_KEY.get(gameKey);
}
