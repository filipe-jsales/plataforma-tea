import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MiniGameLevel } from './entities/mini-game-level.entity';
import { MinigamesService } from './minigames.service';

describe('MinigamesService', () => {
  let service: MinigamesService;
  let repository: jest.Mocked<Repository<MiniGameLevel>>;

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<MiniGameLevel>>;

    service = new MinigamesService(repository);
  });

  describe('findAll', () => {
    it('queries every level ordered by conceptId then position', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { conceptId: 'ASC', position: 'ASC' },
      });
    });
  });

  describe('findByConceptId', () => {
    it('queries by conceptId ordered by position ascending', async () => {
      repository.find.mockResolvedValue([]);

      await service.findByConceptId('fractions_equal_parts');

      expect(repository.find).toHaveBeenCalledWith({
        where: { conceptId: 'fractions_equal_parts' },
        order: { position: 'ASC' },
      });
    });
  });

  describe('findOneOrThrow', () => {
    it('throws NotFoundException when the level does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOneOrThrow('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // MJ9 — a validação semântica por jogo (tema/fração/pool) mudou de lugar
  // pra `validators/fractions-factory.validator.spec.ts` (testada em
  // isolamento, sem repositório). O que este describe cobre agora é só o
  // DISPATCH: `updateLevelConfig` resolve o validador certo pelo `gameKey`
  // da linha, delega a ele, e nunca mais sabe o shape de config de nenhum
  // jogo específico.
  describe('updateLevelConfig', () => {
    function makeLevel(
      config: Record<string, unknown> = {},
      gameKey: MiniGameLevel['gameKey'] = 'fractions_factory',
    ): MiniGameLevel {
      return {
        id: 'level-1',
        conceptId: 'fractions_equal_parts',
        stage: 'modify',
        position: 2,
        title: 'Nível',
        prompt: 'Prepare 3/4',
        config,
        gameKey,
        updatedByUserId: null,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MiniGameLevel;
    }

    it('dispatches to the validator matching the level gameKey, preserving untouched fields, and records the editor', async () => {
      const level = makeLevel({ theme: 'pizza', targetFraction: { numerator: 1, denominator: 4 } });
      repository.findOne.mockResolvedValue(level);
      repository.save.mockImplementation(async (entity) => entity as MiniGameLevel);

      const result = await service.updateLevelConfig('level-1', 'teacher-1', {
        theme: 'chocolate_bar',
      });

      expect(result.config).toEqual({
        theme: 'chocolate_bar',
        targetFraction: { numerator: 1, denominator: 4 },
      });
      expect(result.updatedByUserId).toBe('teacher-1');
    });

    it('still rejects an invalid field with a descriptive message — no regression from the pre-registry behavior', async () => {
      repository.findOne.mockResolvedValue(makeLevel());

      await expect(
        service.updateLevelConfig('level-1', 'teacher-1', { theme: 'space' }),
      ).rejects.toThrow('Tema inválido — escolha barra de chocolate, pizza ou jardim.');
    });

    it('throws InternalServerErrorException for a catalog row whose gameKey has no registered validator', async () => {
      repository.findOne.mockResolvedValue(makeLevel({}, 'work_tools_match' as never));

      await expect(
        service.updateLevelConfig('level-1', 'teacher-1', { theme: 'chocolate_bar' }),
      ).rejects.toThrow(InternalServerErrorException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
