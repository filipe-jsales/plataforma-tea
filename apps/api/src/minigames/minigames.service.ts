import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniGameLevel } from './entities/mini-game-level.entity';
import { UpdateMiniGameLevelDto } from './dto/update-mini-game-level.dto';
import {
  isValidFraction,
  isValidTheme,
  type FractionsFactoryLevelConfig,
} from './mini-game-level-config.interface';

const MAX_FRACTION_POOL_SIZE = 5;

@Injectable()
export class MinigamesService {
  constructor(
    @InjectRepository(MiniGameLevel)
    private readonly levelsRepository: Repository<MiniGameLevel>,
  ) {}

  // 6.5-equivalente pro admin: seletor de nível, todo conceito/jogo
  // cadastrado (hoje só `fractions_equal_parts`, mas o service já suporta
  // N jogos sem mudança, mesmo racional de ChallengesService.findAllWithTopic).
  findAll(): Promise<MiniGameLevel[]> {
    return this.levelsRepository.find({ order: { conceptId: 'ASC', position: 'ASC' } });
  }

  findByConceptId(conceptId: string): Promise<MiniGameLevel[]> {
    return this.levelsRepository.find({
      where: { conceptId },
      order: { position: 'ASC' },
    });
  }

  async findOneOrThrow(id: string): Promise<MiniGameLevel> {
    const level = await this.levelsRepository.findOne({ where: { id } });
    if (!level) {
      throw new NotFoundException('Nível de mini jogo não encontrado.');
    }
    return level;
  }

  // Configurável pelo professor (pedido explícito do produto): edita tema +
  // fração-alvo (níveis 'use'/'modify') e/ou o pool de frações sorteadas na
  // fase Make (nível 'create'), sem exigir conhecimento técnico (regra
  // não-negociável 9) — mensagens de erro descrevem exatamente o campo e o
  // limite pedagógico, nunca um 400 genérico de validação de schema.
  async updateLevelConfig(
    id: string,
    userId: string,
    dto: UpdateMiniGameLevelDto,
  ): Promise<MiniGameLevel> {
    const level = await this.findOneOrThrow(id);
    const current = level.config as Partial<FractionsFactoryLevelConfig>;
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

    level.config = next;
    level.updatedByUserId = userId;
    return this.levelsRepository.save(level);
  }
}
