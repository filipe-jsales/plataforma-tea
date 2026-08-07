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
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<InteractionEvent>>;

    service = new EventsService(repository);
  });

  describe('record', () => {
    it('defaults optional fields (payload, sessionId, challengeId) when absent', async () => {
      repository.create.mockImplementation(
        (entity) => entity as InteractionEvent,
      );
      repository.save.mockImplementation(
        async (entity) => entity as InteractionEvent,
      );

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
      repository.create.mockImplementation(
        (entity) => entity as InteractionEvent,
      );
      repository.save.mockImplementation(
        async (entity) => entity as InteractionEvent,
      );

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
      const result = await service.countDistinctStudentsActiveSince(
        [],
        new Date(),
      );

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

      const result = await service.countDistinctStudentsActiveSince(
        ['p1', 'p2'],
        new Date(),
      );

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

      const result = await service.countDistinctStudentsActiveSince(
        ['p1'],
        new Date(),
      );

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
        getRawMany: jest.fn().mockResolvedValue([
          { studentPseudoId: 'p1', count: '3' },
          { studentPseudoId: 'p2', count: '1' },
        ]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.countAttemptsByStudents(
        ['p1', 'p2'],
        'challenge-1',
      );

      expect(result).toEqual(
        new Map([
          ['p1', 3],
          ['p2', 1],
        ]),
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.challengeId = :challengeId',
        {
          challengeId: 'challenge-1',
        },
      );
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
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ studentPseudoId: 'p1', count: '2' }]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.countAttemptsByStudents(
        ['p1', 'p2'],
        'challenge-1',
      );

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
          .mockResolvedValue([
            { studentPseudoId: 'p1' },
            { studentPseudoId: 'p2' },
          ]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findStudentsWithEvent(
        ['p1', 'p2', 'p3'],
        'challenge-2',
      );

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

      await service.findStudentsWithEvent(
        ['p1'],
        'challenge-1',
        'challenge_use_completed',
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('event.type = :type', {
        type: 'challenge_use_completed',
      });
    });
  });

  describe('findDistinctStudentsForChallenge (6.5)', () => {
    it('returns the distinct pseudoIds with any event on the challenge, platform-wide (no pseudoIds pre-filter)', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { studentPseudoId: 'p1' },
            { studentPseudoId: 'p2' },
          ]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result =
        await service.findDistinctStudentsForChallenge('challenge-1');

      expect(result).toEqual(['p1', 'p2']);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'event.challengeId = :challengeId',
        {
          challengeId: 'challenge-1',
        },
      );
    });
  });

  describe('findEarliestEventTimestamps (6.5)', () => {
    it('groups the earliest createdAt per student, no type filter when omitted', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            studentPseudoId: 'p1',
            earliest: new Date('2026-01-01T10:00:00Z'),
          },
        ]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findEarliestEventTimestamps('challenge-1');

      expect(result.get('p1')).toEqual(new Date('2026-01-01T10:00:00Z'));
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('adds a type filter when given', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findEarliestEventTimestamps(
        'challenge-1',
        'program_executed',
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('event.type = :type', {
        type: 'program_executed',
      });
    });
  });

  describe('countEventsByCategoryForChallenge (6.5)', () => {
    it('fills every RD-* category with 0 when there is no event yet, never a missing key', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result =
        await service.countEventsByCategoryForChallenge('challenge-1');

      expect(result).toEqual({
        'RD-I': 0,
        'RD-P': 0,
        'RD-C': 0,
        'RD-E': 0,
        'RD-L': 0,
      });
    });

    it('fills in the counts that exist, leaving the rest at 0', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ category: EventCategory.PRODUCT, count: '7' }]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result =
        await service.countEventsByCategoryForChallenge('challenge-1');

      expect(result['RD-P']).toBe(7);
      expect(result['RD-I']).toBe(0);
    });
  });

  describe('countEventsByTypeForChallenge (6.5)', () => {
    it('sorts by count desc, ties broken alphabetically by type', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: 'block_dragged', count: '2' },
          { type: 'program_executed', count: '5' },
          { type: 'toolbox_rendered', count: '2' },
        ]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.countEventsByTypeForChallenge('challenge-1');

      expect(result).toEqual([
        { type: 'program_executed', count: 5 },
        { type: 'block_dragged', count: 2 },
        { type: 'toolbox_rendered', count: 2 },
      ]);
    });
  });

  describe('findModifyAttempts (6.5)', () => {
    it('scopes to challenge_modify_attempt on the given challenge, ordered chronologically per student', async () => {
      repository.find.mockResolvedValue([]);

      await service.findModifyAttempts('challenge-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { challengeId: 'challenge-1', type: 'challenge_modify_attempt' },
        order: { studentPseudoId: 'ASC', createdAt: 'ASC' },
      });
    });
  });

  describe('findExecutionsWithPrediction (6.5)', () => {
    it('scopes to program_executed rows whose payload carries a prediction_given field', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findExecutionsWithPrediction('challenge-1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('event.type = :type', {
        type: 'program_executed',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        `event.payload ->> 'prediction_given' IS NOT NULL`,
      );
    });
  });

  describe('findUseCompletions (6.5)', () => {
    it('scopes to the RD-P copy of challenge_use_completed only, never the RD-C copy (would double-count)', async () => {
      repository.find.mockResolvedValue([]);

      await service.findUseCompletions('challenge-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          challengeId: 'challenge-1',
          type: 'challenge_use_completed',
          category: EventCategory.PRODUCT,
        },
        order: { studentPseudoId: 'ASC' },
      });
    });
  });

  describe('findEventsForExport (6.6)', () => {
    function mockQueryBuilder() {
      const queryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as unknown as jest.Mocked<SelectQueryBuilder<InteractionEvent>>;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);
      return queryBuilder;
    }

    it('applies no andWhere when every filter is omitted (caller already guarantees at least one)', async () => {
      const queryBuilder = mockQueryBuilder();

      await service.findEventsForExport({}, 1, 500);

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('filters by pseudoIds, challengeId and a date range together (AND, not OR)', async () => {
      const queryBuilder = mockQueryBuilder();
      const from = new Date('2026-01-01T00:00:00.000Z');
      const to = new Date('2026-01-31T23:59:59.999Z');

      await service.findEventsForExport(
        { pseudoIds: ['p1', 'p2'], challengeId: 'c1', from, to },
        1,
        500,
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.studentPseudoId IN (:...pseudoIds)',
        {
          pseudoIds: ['p1', 'p2'],
        },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.challengeId = :challengeId',
        {
          challengeId: 'c1',
        },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.createdAt >= :from',
        { from },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.createdAt <= :to',
        { to },
      );
    });

    it('paginates by requesting pageSize + 1 rows, offset by (page - 1) * pageSize', async () => {
      const queryBuilder = mockQueryBuilder();

      await service.findEventsForExport({ challengeId: 'c1' }, 3, 100);

      expect(queryBuilder.skip).toHaveBeenCalledWith(200);
      expect(queryBuilder.take).toHaveBeenCalledWith(101);
    });

    it('orders chronologically, with id as a stable tiebreaker', async () => {
      const queryBuilder = mockQueryBuilder();

      await service.findEventsForExport({ challengeId: 'c1' }, 1, 500);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'event.createdAt',
        'ASC',
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('event.id', 'ASC');
    });
  });
});
