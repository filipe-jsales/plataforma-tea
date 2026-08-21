import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  describe('updateLevelConfig', () => {
    function makeLevel(config: Record<string, unknown> = {}): MiniGameLevel {
      return {
        id: 'level-1',
        conceptId: 'fractions_equal_parts',
        stage: 'modify',
        position: 2,
        title: 'Nível',
        prompt: 'Prepare 3/4',
        config,
        updatedByUserId: null,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MiniGameLevel;
    }

    it('rejects an invalid theme with a descriptive message', async () => {
      repository.findOne.mockResolvedValue(makeLevel());

      await expect(
        service.updateLevelConfig('level-1', 'teacher-1', { theme: 'space' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a target fraction with denominator outside 2-8', async () => {
      repository.findOne.mockResolvedValue(makeLevel());

      await expect(
        service.updateLevelConfig('level-1', 'teacher-1', {
          targetFraction: { numerator: 1, denominator: 12 },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a numerator equal to the denominator', async () => {
      repository.findOne.mockResolvedValue(makeLevel());

      await expect(
        service.updateLevelConfig('level-1', 'teacher-1', {
          targetFraction: { numerator: 4, denominator: 4 },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an empty fraction pool', async () => {
      repository.findOne.mockResolvedValue(makeLevel());

      await expect(
        service.updateLevelConfig('level-1', 'teacher-1', { fractionPool: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a fraction pool with more than 5 options', async () => {
      repository.findOne.mockResolvedValue(makeLevel());
      const pool = Array.from({ length: 6 }, (_, i) => ({ numerator: 1, denominator: 2 + i }));

      await expect(
        service.updateLevelConfig('level-1', 'teacher-1', { fractionPool: pool }),
      ).rejects.toThrow(BadRequestException);
    });

    it('merges valid fields into config, preserving untouched fields, and records the editor', async () => {
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
  });
});
