import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChallengesService } from '../challenges/challenges.service';
import { EventsService } from '../events/events.service';
import { MinigamesService } from '../minigames/minigames.service';
import { SchoolsService } from '../schools/schools.service';
import { SubjectsService } from '../subjects/subjects.service';
import { MetricsTeacherService } from './metrics-teacher.service';
import { MetricsService } from './metrics.service';

function fakeConfig(stage: 'use' | 'modify' | 'create') {
  return { stage, allowedBlockTypes: [], goal: {} };
}

describe('MetricsTeacherService', () => {
  let service: MetricsTeacherService;
  let schoolsService: jest.Mocked<SchoolsService>;
  let subjectsService: jest.Mocked<SubjectsService>;
  let challengesService: jest.Mocked<ChallengesService>;
  let eventsService: jest.Mocked<EventsService>;
  let metricsService: jest.Mocked<MetricsService>;
  let minigamesService: jest.Mocked<MinigamesService>;

  beforeEach(() => {
    schoolsService = {
      findClassroomById: jest.fn(),
      findActiveStudentsInClassroom: jest.fn(),
    } as unknown as jest.Mocked<SchoolsService>;
    subjectsService = {
      findAllTopics: jest.fn(),
      findTopicByConceptId: jest.fn(),
    } as unknown as jest.Mocked<SubjectsService>;
    challengesService = {
      findByTopicIdOrdered: jest.fn(),
    } as unknown as jest.Mocked<ChallengesService>;
    eventsService = {
      countDistinctStudentsActiveSince: jest.fn(),
      findStudentsWithEvent: jest.fn(),
      findStudentsWithMiniGameEvent: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;
    metricsService = {
      getChallengeProgressForStudents: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;
    minigamesService = {
      findByConceptId: jest.fn(),
    } as unknown as jest.Mocked<MinigamesService>;

    service = new MetricsTeacherService(
      schoolsService,
      subjectsService,
      challengesService,
      eventsService,
      metricsService,
      minigamesService,
    );
  });

  describe('access control (shared by both endpoints)', () => {
    it('throws NotFoundException when the classroom does not exist', async () => {
      schoolsService.findClassroomById.mockResolvedValue(null);

      await expect(service.getStudentsProgress('missing', 'teacher-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the classroom belongs to a different teacher, even same school', async () => {
      schoolsService.findClassroomById.mockResolvedValue({
        id: 'c1',
        teacherId: 'other-teacher',
      } as any);

      await expect(service.getStudentsProgress('c1', 'teacher-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(schoolsService.findActiveStudentsInClassroom).not.toHaveBeenCalled();
    });

    it('never queries student data before the ownership check resolves', async () => {
      schoolsService.findClassroomById.mockResolvedValue(null);

      await expect(service.getClassroomSummary('missing', 'teacher-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(schoolsService.findActiveStudentsInClassroom).not.toHaveBeenCalled();
    });
  });

  describe('getStudentsProgress (6.3)', () => {
    beforeEach(() => {
      schoolsService.findClassroomById.mockResolvedValue({ id: 'c1', teacherId: 'teacher-1' } as any);
      subjectsService.findAllTopics.mockResolvedValue([{ id: 'topic-1' } as any]);
      challengesService.findByTopicIdOrdered.mockResolvedValue([
        { id: 'ch-use', title: 'Monte o quadrado', config: fakeConfig('use') } as any,
        { id: 'ch-create', title: 'Sua vez!', config: fakeConfig('create') } as any,
      ]);
    });

    it('returns an empty list for a classroom with no active enrollment, never an error', async () => {
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([]);
      metricsService.getChallengeProgressForStudents.mockResolvedValue(new Map());

      const result = await service.getStudentsProgress('c1', 'teacher-1');

      expect(result).toEqual([]);
    });

    it('sorts students by enrolledAt ascending by default, never by performance', async () => {
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        {
          student: { pseudonymId: 'p-later', displayName: 'Beatriz' },
          enrolledAt: new Date('2026-02-01'),
        } as any,
        {
          student: { pseudonymId: 'p-earlier', displayName: 'Ana' },
          enrolledAt: new Date('2026-01-01'),
        } as any,
      ]);
      metricsService.getChallengeProgressForStudents.mockResolvedValue(new Map());

      const result = await service.getStudentsProgress('c1', 'teacher-1');

      expect(result.map((student) => student.studentPseudoId)).toEqual(['p-earlier', 'p-later']);
    });

    it('builds one entry per available challenge, with stage/status/attempts from the 6.1 engine', async () => {
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        { student: { pseudonymId: 'p1', displayName: 'Ana' }, enrolledAt: new Date('2026-01-01') } as any,
      ]);
      metricsService.getChallengeProgressForStudents.mockImplementation(async (_pseudoIds, params) => {
        if (params.challengeId === 'ch-use') {
          return new Map([['p1', { status: 'completed', attempts: 2 }]]);
        }
        return new Map([['p1', { status: 'not_started', attempts: 0 }]]);
      });

      const result = await service.getStudentsProgress('c1', 'teacher-1');

      expect(result).toEqual([
        {
          studentPseudoId: 'p1',
          displayName: 'Ana',
          enrolledAt: new Date('2026-01-01'),
          challenges: [
            { challengeId: 'ch-use', title: 'Monte o quadrado', stage: 'use', status: 'completed', attempts: 2 },
            { challengeId: 'ch-create', title: 'Sua vez!', stage: 'create', status: 'not_started', attempts: 0 },
          ],
        },
      ]);
      expect(metricsService.getChallengeProgressForStudents).toHaveBeenCalledWith(['p1'], {
        challengeId: 'ch-use',
        stage: 'use',
        nextChallengeId: 'ch-create',
      });
      expect(metricsService.getChallengeProgressForStudents).toHaveBeenCalledWith(['p1'], {
        challengeId: 'ch-create',
        stage: 'create',
        nextChallengeId: null,
      });
    });

    it('skips a challenge whose config is not set up yet, instead of crashing', async () => {
      challengesService.findByTopicIdOrdered.mockResolvedValue([
        { id: 'ch-empty', title: 'Rascunho', config: {} } as any,
      ]);
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        { student: { pseudonymId: 'p1', displayName: 'Ana' }, enrolledAt: new Date() } as any,
      ]);

      const result = await service.getStudentsProgress('c1', 'teacher-1');

      expect(result[0].challenges).toEqual([]);
      expect(metricsService.getChallengeProgressForStudents).not.toHaveBeenCalled();
    });

    it('keeps each topic sequence independent — nextChallengeId never crosses topics', async () => {
      subjectsService.findAllTopics.mockResolvedValue([{ id: 'topic-1' } as any, { id: 'topic-2' } as any]);
      challengesService.findByTopicIdOrdered.mockImplementation(async (topicId) => {
        if (topicId === 'topic-1') {
          return [{ id: 'a1', title: 'A1', config: fakeConfig('use') } as any];
        }
        return [{ id: 'b1', title: 'B1', config: fakeConfig('use') } as any];
      });
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        { student: { pseudonymId: 'p1', displayName: 'Ana' }, enrolledAt: new Date() } as any,
      ]);
      metricsService.getChallengeProgressForStudents.mockResolvedValue(
        new Map([['p1', { status: 'not_started' as const, attempts: 0 }]]),
      );

      await service.getStudentsProgress('c1', 'teacher-1');

      expect(metricsService.getChallengeProgressForStudents).toHaveBeenCalledWith(['p1'], {
        challengeId: 'a1',
        stage: 'use',
        nextChallengeId: null,
      });
      expect(metricsService.getChallengeProgressForStudents).toHaveBeenCalledWith(['p1'], {
        challengeId: 'b1',
        stage: 'use',
        nextChallengeId: null,
      });
    });
  });

  describe('getClassroomSummary (6.4)', () => {
    beforeEach(() => {
      schoolsService.findClassroomById.mockResolvedValue({ id: 'c1', teacherId: 'teacher-1' } as any);
      subjectsService.findAllTopics.mockResolvedValue([{ id: 'topic-1' } as any]);
      challengesService.findByTopicIdOrdered.mockResolvedValue([
        { id: 'ch-use', title: 'Monte o quadrado', config: fakeConfig('use') } as any,
        { id: 'ch-create', title: 'Sua vez!', config: fakeConfig('create') } as any,
      ]);
    });

    it('returns zeros for a classroom with no active students, never an error/divide-by-zero', async () => {
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([]);

      const result = await service.getClassroomSummary('c1', 'teacher-1');

      expect(result).toEqual({
        totalStudents: 0,
        activeStudentsToday: 0,
        byStage: [
          { stage: 'use', studentsCompleted: 0, studentsInProgress: 0, studentsNotStarted: 0 },
          { stage: 'modify', studentsCompleted: 0, studentsInProgress: 0, studentsNotStarted: 0 },
          { stage: 'create', studentsCompleted: 0, studentsInProgress: 0, studentsNotStarted: 0 },
        ],
        helpButtonUsageRate: 0,
      });
      expect(eventsService.countDistinctStudentsActiveSince).not.toHaveBeenCalled();
    });

    it('never lists student names — only aggregate counts', async () => {
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        { student: { pseudonymId: 'p1', displayName: 'Ana' }, enrolledAt: new Date() } as any,
      ]);
      metricsService.getChallengeProgressForStudents.mockResolvedValue(
        new Map([['p1', { status: 'not_started' as const, attempts: 0 }]]),
      );
      eventsService.countDistinctStudentsActiveSince.mockResolvedValue(0);
      eventsService.findStudentsWithEvent.mockResolvedValue(new Set());

      const result = await service.getClassroomSummary('c1', 'teacher-1');

      expect(JSON.stringify(result)).not.toContain('Ana');
      expect(JSON.stringify(result)).not.toContain('p1');
    });

    it('aggregates byStage counts across students for the matching stage only', async () => {
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        { student: { pseudonymId: 'p1', displayName: 'Ana' }, enrolledAt: new Date() } as any,
        { student: { pseudonymId: 'p2', displayName: 'Bia' }, enrolledAt: new Date() } as any,
      ]);
      metricsService.getChallengeProgressForStudents.mockImplementation(async (_pseudoIds, params) => {
        if (params.challengeId === 'ch-use') {
          return new Map([
            ['p1', { status: 'completed', attempts: 1 }],
            ['p2', { status: 'in_progress', attempts: 1 }],
          ]);
        }
        return new Map([
          ['p1', { status: 'not_started', attempts: 0 }],
          ['p2', { status: 'not_started', attempts: 0 }],
        ]);
      });
      eventsService.countDistinctStudentsActiveSince.mockResolvedValue(1);
      eventsService.findStudentsWithEvent.mockResolvedValue(new Set());

      const result = await service.getClassroomSummary('c1', 'teacher-1');

      expect(result.byStage).toEqual([
        { stage: 'use', studentsCompleted: 1, studentsInProgress: 1, studentsNotStarted: 0 },
        { stage: 'modify', studentsCompleted: 0, studentsInProgress: 0, studentsNotStarted: 0 },
        { stage: 'create', studentsCompleted: 0, studentsInProgress: 0, studentsNotStarted: 2 },
      ]);
      expect(result.totalStudents).toBe(2);
      expect(result.activeStudentsToday).toBe(1);
    });

    it('computes helpButtonUsageRate from create-stage challenges only, as a rounded percentage', async () => {
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        { student: { pseudonymId: 'p1', displayName: 'Ana' }, enrolledAt: new Date() } as any,
        { student: { pseudonymId: 'p2', displayName: 'Bia' }, enrolledAt: new Date() } as any,
        { student: { pseudonymId: 'p3', displayName: 'Caio' }, enrolledAt: new Date() } as any,
      ]);
      metricsService.getChallengeProgressForStudents.mockResolvedValue(new Map());
      eventsService.countDistinctStudentsActiveSince.mockResolvedValue(0);
      eventsService.findStudentsWithEvent.mockImplementation(async (_pseudoIds, challengeId) => {
        if (challengeId === 'ch-create') {
          return new Set(['p1']);
        }
        return new Set();
      });

      const result = await service.getClassroomSummary('c1', 'teacher-1');

      expect(result.helpButtonUsageRate).toBe(33);
      expect(eventsService.findStudentsWithEvent).toHaveBeenCalledWith(
        ['p1', 'p2', 'p3'],
        'ch-create',
        'challenge.help_viewed',
      );
      expect(eventsService.findStudentsWithEvent).not.toHaveBeenCalledWith(
        expect.anything(),
        'ch-use',
        expect.anything(),
      );
    });

    it('passes the start of today (not now) to countDistinctStudentsActiveSince', async () => {
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        { student: { pseudonymId: 'p1', displayName: 'Ana' }, enrolledAt: new Date() } as any,
      ]);
      metricsService.getChallengeProgressForStudents.mockResolvedValue(new Map());
      eventsService.countDistinctStudentsActiveSince.mockResolvedValue(0);
      eventsService.findStudentsWithEvent.mockResolvedValue(new Set());

      await service.getClassroomSummary('c1', 'teacher-1');

      const [, since] = eventsService.countDistinctStudentsActiveSince.mock.calls[0];
      expect(since.getHours()).toBe(0);
      expect(since.getMinutes()).toBe(0);
    });
  });

  describe('getConceptComparison (MJ8)', () => {
    beforeEach(() => {
      schoolsService.findClassroomById.mockResolvedValue({ id: 'c1', teacherId: 'teacher-1' } as any);
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        { student: { pseudonymId: 'p1', displayName: 'Ana' }, enrolledAt: new Date('2026-01-01') } as any,
      ]);
    });

    it('rejects a classroom that is not the teacher\'s own, same as the other endpoints', async () => {
      schoolsService.findClassroomById.mockResolvedValue({ id: 'c1', teacherId: 'other-teacher' } as any);

      await expect(
        service.getConceptComparison('c1', 'teacher-1', 'fractions_equal_parts'),
      ).rejects.toThrow(ForbiddenException);
      expect(schoolsService.findActiveStudentsInClassroom).not.toHaveBeenCalled();
    });

    it('hasBlocksChallenge is false and blocks is an empty array when no topic uses this conceptId yet (estado normal, não erro)', async () => {
      subjectsService.findTopicByConceptId.mockResolvedValue(null);
      minigamesService.findByConceptId.mockResolvedValue([
        { id: 'l-use', title: 'Observe o pedido pronto', stage: 'use' } as any,
      ]);
      eventsService.findStudentsWithMiniGameEvent.mockResolvedValue(new Set());

      const result = await service.getConceptComparison('c1', 'teacher-1', 'fractions_equal_parts');

      expect(result.hasBlocksChallenge).toBe(false);
      expect(result.students[0].blocks).toEqual([]);
      expect(challengesService.findByTopicIdOrdered).not.toHaveBeenCalled();
    });

    it('hasMiniGame is false and miniGame is an empty array when no level uses this conceptId', async () => {
      subjectsService.findTopicByConceptId.mockResolvedValue(null);
      minigamesService.findByConceptId.mockResolvedValue([]);

      const result = await service.getConceptComparison('c1', 'teacher-1', 'unknown_concept');

      expect(result.hasMiniGame).toBe(false);
      expect(result.students[0].miniGame).toEqual([]);
    });

    it('builds both signals side by side for the same student when both exist for the conceptId', async () => {
      subjectsService.findTopicByConceptId.mockResolvedValue({ id: 'topic-1' } as any);
      challengesService.findByTopicIdOrdered.mockResolvedValue([
        { id: 'ch-use', title: 'Monte o quadrado', config: fakeConfig('use') } as any,
      ]);
      metricsService.getChallengeProgressForStudents.mockResolvedValue(
        new Map([['p1', { status: 'completed', attempts: 2 }]]),
      );
      minigamesService.findByConceptId.mockResolvedValue([
        { id: 'l-use', title: 'Observe o pedido pronto', stage: 'use' } as any,
      ]);
      eventsService.findStudentsWithMiniGameEvent.mockImplementation(async (pseudoIds, _levelId, type) => {
        if (!type) return new Set(pseudoIds); // "qualquer evento" — chegou ao nível
        return new Set(); // ainda não completou
      });

      const result = await service.getConceptComparison('c1', 'teacher-1', 'fractions_equal_parts');

      expect(result.hasBlocksChallenge).toBe(true);
      expect(result.hasMiniGame).toBe(true);
      expect(result.students).toEqual([
        {
          studentPseudoId: 'p1',
          displayName: 'Ana',
          blocks: [{ challengeId: 'ch-use', title: 'Monte o quadrado', stage: 'use', status: 'completed', attempts: 2 }],
          miniGame: [{ levelId: 'l-use', title: 'Observe o pedido pronto', stage: 'use', status: 'in_progress' }],
        },
      ]);
    });

    it('never derives a clinical interpretation — status is always the raw not_started/in_progress/completed vocabulary', async () => {
      subjectsService.findTopicByConceptId.mockResolvedValue(null);
      minigamesService.findByConceptId.mockResolvedValue([
        { id: 'l-use', title: 'Observe o pedido pronto', stage: 'use' } as any,
      ]);
      eventsService.findStudentsWithMiniGameEvent.mockResolvedValue(new Set());

      const result = await service.getConceptComparison('c1', 'teacher-1', 'fractions_equal_parts');

      expect(JSON.stringify(result)).not.toMatch(/sobrecarga|dificuldade|diagn[oó]stico/i);
    });
  });
});
