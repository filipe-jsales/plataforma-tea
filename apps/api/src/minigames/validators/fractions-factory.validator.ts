import { BadRequestException } from '@nestjs/common';
import type { UpdateMiniGameLevelDto } from '../dto/update-mini-game-level.dto';
import {
  isValidFraction,
  isValidTheme,
  type FractionsFactoryLevelConfig,
} from '../mini-game-level-config.interface';
import type { MiniGameLevelValidator } from './mini-game-level-validator.interface';

const MAX_FRACTION_POOL_SIZE = 5;

// MJ9 — extraído de `MinigamesService.updateLevelConfig` (comportamento
// idêntico, coberto pelos mesmos casos de teste que já existiam, ver
// fractions-factory.validator.spec.ts) na generalização pra múltiplos
// jogos. Validação semântica real, nunca decorativa (regra não-negociável
// 9): tema dentro do enum conhecido, fração com denominador 2-8 e
// numerador 1..denominador-1, pool de 1 a 5 opções.
export class FractionsFactoryValidator implements MiniGameLevelValidator {
  readonly gameKey = 'fractions_factory' as const;

  applyUpdate(
    currentConfig: Record<string, unknown>,
    dto: UpdateMiniGameLevelDto,
  ): Record<string, unknown> {
    const current = currentConfig as Partial<FractionsFactoryLevelConfig>;
    const next: Partial<FractionsFactoryLevelConfig> = { ...current };

    if (dto.theme !== undefined) {
      if (!isValidTheme(dto.theme)) {
        throw new BadRequestException(
          'Tema inválido — escolha barra de chocolate, pizza ou jardim.',
        );
      }
      next.theme = dto.theme;
    }

    if (dto.targetFraction !== undefined) {
      if (!isValidFraction(dto.targetFraction)) {
        throw new BadRequestException(
          'Fração-alvo inválida — o denominador deve estar entre 2 e 8, e o numerador entre 1 e o denominador menos 1.',
        );
      }
      next.targetFraction = dto.targetFraction;
    }

    if (dto.fractionPool !== undefined) {
      if (
        dto.fractionPool.length === 0 ||
        dto.fractionPool.length > MAX_FRACTION_POOL_SIZE
      ) {
        throw new BadRequestException(
          `O pool de frações deve ter entre 1 e ${MAX_FRACTION_POOL_SIZE} opções.`,
        );
      }
      if (!dto.fractionPool.every(isValidFraction)) {
        throw new BadRequestException(
          'Toda fração do pool precisa ter denominador entre 2 e 8 e numerador entre 1 e o denominador menos 1.',
        );
      }
      next.fractionPool = dto.fractionPool;
    }

    return next;
  }
}
