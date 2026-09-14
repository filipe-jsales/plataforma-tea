import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MiniGameLevel } from './entities/mini-game-level.entity';
import { UpdateMiniGameLevelDto } from './dto/update-mini-game-level.dto';
import { getMiniGameLevelValidator } from './validators/validator-registry';

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

  // MJ9 — configurável pelo professor (pedido explícito do produto), agora
  // despachado por `gameKey` (mesma técnica de registry já usada em
  // `challenge-templates`): este service nunca mais precisa saber o shape
  // de config de nenhum jogo específico, cadastrar um jogo novo não toca
  // este arquivo. Validação semântica real continua vivendo no validador
  // de cada jogo, sem exigir conhecimento técnico do professor (regra
  // não-negociável 9) — mensagens de erro descritivas por campo, nunca um
  // 400 genérico de schema.
  async updateLevelConfig(
    id: string,
    userId: string,
    dto: UpdateMiniGameLevelDto,
  ): Promise<MiniGameLevel> {
    const level = await this.findOneOrThrow(id);
    const validator = getMiniGameLevelValidator(level.gameKey);
    if (!validator) {
      // Linha de catálogo sem validador correspondente registrado — erro de
      // dado/deploy (jogo cadastrado sem o código do validador acompanhar),
      // nunca algo que o professor causou preenchendo o formulário. Mesmo
      // racional de `ChallengeTemplatesService.loadTemplateAndHandler`.
      throw new InternalServerErrorException(
        'Este jogo está temporariamente indisponível pra configuração.',
      );
    }

    level.config = validator.applyUpdate(level.config, dto);
    level.updatedByUserId = userId;
    return this.levelsRepository.save(level);
  }
}
