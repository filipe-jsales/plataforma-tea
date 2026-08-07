import { Repository, SelectQueryBuilder } from 'typeorm';
import { EventCategory } from '../common/enums/event-category.enum';
import { InteractionEvent } from './entities/interaction-event.entity';
import { EventsService } from './events.service';

describe('EventsService', () => {
  let service: EventsService;
  let repository: jest.Mocked<Repository<InteractionEvent>>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<InteractionEvent>>;

    service = new EventsService(repository);
  });

  describe('record', () => {
    it('defaults optional fields (payload, sessionId, challengeId) when absent', async () => {
      repository.create.mockImplementation((entity) => entity as InteractionEvent);
      repository.save.mockImplementation(async (entity) => entity as InteractionEvent);

      await service.record({
        studentPseudoId: 'pseudo-1',
        category: EventCategory.INTERACTION,
        type: 'block_snap',
      });

      expect(repository.create).toHaveBeenCalledWith({
        studentPseudoId: 'pseudo-1',
        category: EventCategory.INTERACTION,
        type: 'block_snap',
        payload: {},
        sessionId: null,
        challengeId: null,
      });
    });

    it('preserves provided optional fields', async () => {
      repository.create.mockImplementation((entity) => entity as InteractionEvent);
      repository.save.mockImplementation(async (entity) => entity as InteractionEvent);

      await service.record({
        studentPseudoId: 'pseudo-1',
        category: EventCategory.CURRICULAR,
        type: 'challenge.completed',
        payload: { attempts: 2 },
        sessionId: 'session-1',
        challengeId: 'challenge-1',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { attempts: 2 },
          sessionId: 'session-1',
          challengeId: 'challenge-1',
        }),
      );
    });
  });

  describe('countDistinctStudentsActiveSince', () => {
    it('short-circuits to 0 without querying when pseudoIds is empty', async () => {
      const result = await service.countDistinctStudentsActiveSince([], new Date());

      expect(result).toBe(0);
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns the count parsed from the raw query result', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '3' }),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.countDistinctStudentsActiveSince(['p1', 'p2'], new Date());

      expect(result).toBe(3);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'event.studentPseudoId IN (:...pseudoIds)',
        { pseudoIds: ['p1', 'p2'] },
      );
    });

    it('returns 0 when the query yields no raw row', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(undefined),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.countDistinctStudentsActiveSince(['p1'], new Date());

      expect(result).toBe(0);
    });
  });

  describe('countByStudentCategoryType', () => {
    it('scopes the count to the given student, category and type', async () => {
      repository.count.mockResolvedValue(5);

      const result = await service.countByStudentCategoryType(
        'pseudo-1',
        EventCategory.CURRICULAR,
        'challenge.completed',
      );

      expect(result).toBe(5);
      expect(repository.count).toHaveBeenCalledWith({
        where: {
          studentPseudoId: 'pseudo-1',
          category: EventCategory.CURRICULAR,
          type: 'challenge.completed',
        },
      });
    });
  });

  describe('countAttemptsByStudents', () => {
    it('short-circuits to an empty map without querying when pseudoIds is empty', async () => {
      const result = await service.countAttemptsByStudents([], 'challenge-1');

      expect(result).toEqual(new Map());
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('groups program_executed counts per student', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { studentPseudoId: 'p1', count: '3' },
            { studentPseudoId: 'p2', count: '1' },
          ]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.countAttemptsByStudents(['p1', 'p2'], 'challenge-1');

      expect(result).toEqual(
        new Map([
          ['p1', 3],
          ['p2', 1],
        ]),
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('event.challengeId = :challengeId', {
        challengeId: 'challenge-1',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('event.type = :type', {
        type: 'program_executed',
      });
    });

    it('omits a student from the map entirely when they have 0 attempts (never a 0 entry)', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ studentPseudoId: 'p1', count: '2' }]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.countAttemptsByStudents(['p1', 'p2'], 'challenge-1');

      expect(result.has('p2')).toBe(false);
    });
  });

  describe('findStudentsWithEvent', () => {
    it('short-circuits to an empty set without querying when pseudoIds is empty', async () => {
      const result = await service.findStudentsWithEvent([], 'challenge-1');

      expect(result).toEqual(new Set());
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns the distinct students with any event on the challenge when no type is given', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ studentPseudoId: 'p1' }, { studentPseudoId: 'p2' }]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findStudentsWithEvent(['p1', 'p2', 'p3'], 'challenge-2');

      expect(result).toEqual(new Set(['p1', 'p2']));
      // Sem `type`: só studentPseudoId + challengeId no andWhere — nunca um
      // terceiro andWhere de type.
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1);
    });

    it('scopes to a specific type when given (ex.: challenge_use_completed)', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ studentPseudoId: 'p1' }]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findStudentsWithEvent(['p1'], 'challenge-1', 'challenge_use_completed');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('event.type = :type', {
        type: 'challenge_use_completed',
      });
    });
  });
});
