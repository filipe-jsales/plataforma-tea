import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ChallengesService } from '../challenges/challenges.service';
import { EventCategory } from '../common/enums/event-category.enum';
import { InteractionEvent } from '../events/entities/interaction-event.entity';
import { EventsService } from '../events/events.service';
import { SchoolsService } from '../schools/schools.service';
import { MetricsAdminExportService } from './metrics-admin-export.service';

function makeEvent(
  overrides: Partial<InteractionEvent> = {},
): InteractionEvent {
  return {
    id: 'event-1',
    studentPseudoId: 'pseudo-1',
    category: EventCategory.PRODUCT,
    type: 'program_executed',
    payload: {},
    sessionId: null,
    challengeId: 'challenge-1',
    challenge: null,
    createdAt: new Date('2026-01-05T10:00:00.000Z'),
    ...overrides,
  };
}

describe('MetricsAdminExportService', () => {
  let service: MetricsAdminExportService;
  let schoolsService: jest.Mocked<SchoolsService>;
  let challengesService: jest.Mocked<ChallengesService>;
  let eventsService: jest.Mocked<EventsService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    schoolsService = {
      findSchoolById: jest.fn(),
      findAllStudentPseudoIdsBySchool: jest.fn(),
    } as unknown as jest.Mocked<SchoolsService>;
    challengesService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ChallengesService>;
    eventsService = {
      findEventsForExport: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;
    auditService = {
      recordExport: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    service = new MetricsAdminExportService(
      schoolsService,
      challengesService,
      eventsService,
      auditService,
    );
  });

  it('rejects the request when no filter (school/challenge/period) is given', async () => {
    await expect(service.exportEvents({} as any, 'admin-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(eventsService.findEventsForExport).not.toHaveBeenCalled();
    expect(auditService.recordExport).not.toHaveBeenCalled();
  });

  it('rejects a period with only "from" and no "to" (incomplete period, not a valid filter)', async () => {
    await expect(
      service.exportEvents({ from: '2026-01-01' } as any, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects "to" before "from"', async () => {
    await expect(
      service.exportEvents(
        { from: '2026-02-01', to: '2026-01-01' } as any,
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a period longer than 90 days with a clear message, never truncating silently', async () => {
    await expect(
      service.exportEvents(
        { from: '2026-01-01', to: '2026-05-01' } as any,
        'admin-1',
      ),
    ).rejects.toThrow(/90 dias/);
    expect(eventsService.findEventsForExport).not.toHaveBeenCalled();
  });

  it('accepts a period of exactly 90 days', async () => {
    eventsService.findEventsForExport.mockResolvedValue([]);
    auditService.recordExport.mockResolvedValue(undefined as any);

    await expect(
      service.exportEvents(
        { from: '2026-01-01', to: '2026-03-31' } as any,
        'admin-1',
      ),
    ).resolves.toBeDefined();
  });

  it('throws NotFoundException for a schoolId that does not exist', async () => {
    schoolsService.findSchoolById.mockResolvedValue(null);

    await expect(
      service.exportEvents({ schoolId: 'school-x' } as any, 'admin-1'),
    ).rejects.toThrow(NotFoundException);
    expect(eventsService.findEventsForExport).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for a challengeId that does not exist', async () => {
    challengesService.findById.mockResolvedValue(null);

    await expect(
      service.exportEvents({ challengeId: 'challenge-x' } as any, 'admin-1'),
    ).rejects.toThrow(NotFoundException);
    expect(eventsService.findEventsForExport).not.toHaveBeenCalled();
  });

  it('returns an empty result and still audits the export when the school has no enrolled student ever', async () => {
    schoolsService.findSchoolById.mockResolvedValue({ id: 'school-1' } as any);
    schoolsService.findAllStudentPseudoIdsBySchool.mockResolvedValue([]);
    auditService.recordExport.mockResolvedValue(undefined as any);

    const result = await service.exportEvents(
      { schoolId: 'school-1' },
      'admin-1',
    );

    expect(result).toEqual({
      rows: [],
      page: 1,
      pageSize: 500,
      hasMore: false,
    });
    expect(eventsService.findEventsForExport).not.toHaveBeenCalled();
    expect(auditService.recordExport).toHaveBeenCalledWith({
      adminUserId: 'admin-1',
      filters: {
        schoolId: 'school-1',
        challengeId: null,
        from: null,
        to: null,
        format: 'json',
        page: 1,
        pageSize: 500,
      },
      rowCount: 0,
    });
  });

  it('resolves the school filter to pseudoIds before querying events', async () => {
    schoolsService.findSchoolById.mockResolvedValue({ id: 'school-1' } as any);
    schoolsService.findAllStudentPseudoIdsBySchool.mockResolvedValue([
      'p1',
      'p2',
    ]);
    eventsService.findEventsForExport.mockResolvedValue([]);
    auditService.recordExport.mockResolvedValue(undefined as any);

    await service.exportEvents({ schoolId: 'school-1' }, 'admin-1');

    expect(eventsService.findEventsForExport).toHaveBeenCalledWith(
      {
        pseudoIds: ['p1', 'p2'],
        challengeId: undefined,
        from: undefined,
        to: undefined,
      },
      1,
      500,
    );
  });

  it('maps each InteractionEvent to the exact export row shape, never a join-derived field', async () => {
    challengesService.findById.mockResolvedValue({ id: 'challenge-1' } as any);
    eventsService.findEventsForExport.mockResolvedValue([
      makeEvent({ payload: { attempts: 2 }, sessionId: 'session-1' }),
    ]);
    auditService.recordExport.mockResolvedValue(undefined as any);

    const result = await service.exportEvents(
      { challengeId: 'challenge-1' },
      'admin-1',
    );

    expect(result.rows).toEqual([
      {
        id: 'event-1',
        studentPseudoId: 'pseudo-1',
        category: EventCategory.PRODUCT,
        type: 'program_executed',
        payload: { attempts: 2 },
        sessionId: 'session-1',
        challengeId: 'challenge-1',
        createdAt: '2026-01-05T10:00:00.000Z',
      },
    ]);
  });

  it('signals hasMore when the repository returns one extra row beyond pageSize, and strips it from the output', async () => {
    challengesService.findById.mockResolvedValue({ id: 'challenge-1' } as any);
    eventsService.findEventsForExport.mockResolvedValue([
      makeEvent({ id: 'e1' }),
      makeEvent({ id: 'e2' }),
    ]);
    auditService.recordExport.mockResolvedValue(undefined as any);

    const result = await service.exportEvents(
      { challengeId: 'challenge-1', pageSize: 1 },
      'admin-1',
    );

    expect(result.rows).toHaveLength(1);
    expect(result.hasMore).toBe(true);
  });

  it('reports hasMore=false when the repository returns exactly pageSize rows or fewer', async () => {
    challengesService.findById.mockResolvedValue({ id: 'challenge-1' } as any);
    eventsService.findEventsForExport.mockResolvedValue([makeEvent()]);
    auditService.recordExport.mockResolvedValue(undefined as any);

    const result = await service.exportEvents(
      { challengeId: 'challenge-1', pageSize: 10 },
      'admin-1',
    );

    expect(result.hasMore).toBe(false);
  });

  it('audits the export with the row count actually returned (after stripping the extra hasMore row)', async () => {
    challengesService.findById.mockResolvedValue({ id: 'challenge-1' } as any);
    eventsService.findEventsForExport.mockResolvedValue([
      makeEvent({ id: 'e1' }),
      makeEvent({ id: 'e2' }),
    ]);
    auditService.recordExport.mockResolvedValue(undefined as any);

    await service.exportEvents(
      { challengeId: 'challenge-1', pageSize: 1 },
      'admin-1',
    );

    expect(auditService.recordExport).toHaveBeenCalledWith(
      expect.objectContaining({ rowCount: 1 }),
    );
  });

  it('combines school + challenge + period filters together (AND, not mutually exclusive)', async () => {
    schoolsService.findSchoolById.mockResolvedValue({ id: 'school-1' } as any);
    schoolsService.findAllStudentPseudoIdsBySchool.mockResolvedValue(['p1']);
    challengesService.findById.mockResolvedValue({ id: 'challenge-1' } as any);
    eventsService.findEventsForExport.mockResolvedValue([]);
    auditService.recordExport.mockResolvedValue(undefined as any);

    await service.exportEvents(
      {
        schoolId: 'school-1',
        challengeId: 'challenge-1',
        from: '2026-01-01',
        to: '2026-01-10',
      },
      'admin-1',
    );

    expect(eventsService.findEventsForExport).toHaveBeenCalledWith(
      expect.objectContaining({
        pseudoIds: ['p1'],
        challengeId: 'challenge-1',
        from: new Date('2026-01-01T00:00:00.000Z'),
      }),
      1,
      500,
    );
  });
});
