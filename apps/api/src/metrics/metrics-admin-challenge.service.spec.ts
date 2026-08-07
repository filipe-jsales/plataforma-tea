import { NotFoundException } from '@nestjs/common';
import { ChallengesService } from '../challenges/challenges.service';
import { InteractionEvent } from '../events/entities/interaction-event.entity';
import { EventsService } from '../events/events.service';
import { SettingsService } from '../settings/settings.service';
import { MetricsAdminChallengeService } from './metrics-admin-challenge.service';
import { MetricsService } from './metrics.service';

function fakeConfig(stage: 'use' | 'modify' | 'create') {
  return { stage, allowedBlockTypes: [], goal: {} };
}

function fakeEvent(studentPseudoId: string, payload: Record<string, unknown>): InteractionEvent {
  return { studentPseudoId, payload } as InteractionEvent;
}

describe('MetricsAdminChallengeService', () => {
  let service: MetricsAdminChallengeService;
  let challengesService: jest.Mocked<ChallengesService>;
  let eventsService: jest.Mocked<EventsService>;
  let settingsService: jest.Mocked<SettingsService>;
  let metricsService: jest.Mocked<MetricsService>;

  beforeEach(() => {
    challengesService = {
      findAllWithTopic: jest.fn(),
      findById: jest.fn(),
      findByTopicIdOrdered: jest.fn(),
    } as unknown as jest.Mocked<ChallengesService>;
    eventsService = {
      findDistinctStudentsForChallenge: jest.fn(),
      findEarliestEventTimestamps: jest.fn(),
      countEventsByCategoryForChallenge: jest.fn(),
      countEventsByTypeForChallenge: jest.fn(),
      findModifyAttempts: jest.fn(),
      findExecutionsWithPrediction: jest.fn(),
      findUseCompletions: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;
    settingsService = {
      getOrCreate: jest.fn(),
    } as unknown as jest.Mocked<SettingsService>;
    metricsService = {
      getChallengeProgressForStudents: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;

    settingsService.getOrCreate.mockResolvedValue({
      id: 's1',
      minSampleSizeThreshold: 5,
      updatedAt: new Date(),
    });
    eventsService.findEarliestEventTimestamps.mockResolvedValue(new Map());
    eventsService.countEventsByCategoryForChallenge.mockResolvedValue({
      'RD-I': 0,
      'RD-P': 0,
      'RD-C': 0,
      'RD-E': 0,
      'RD-L': 0,
    });
    eventsService.countEventsByTypeForChallenge.mockResolvedValue([]);
    eventsService.findModifyAttempts.mockResolvedValue([]);
    eventsService.findExecutionsWithPrediction.mockResolvedValue([]);
    eventsService.findUseCompletions.mockResolvedValue([]);
    challengesService.findByTopicIdOrdered.mockResolvedValue([]);
    metricsService.getChallengeProgressForStudents.mockResolvedValue(new Map());

    service = new MetricsAdminChallengeService(
      challengesService,
      eventsService,
      settingsService,
      metricsService,
    );
  });

  describe('listChallenges', () => {
    it('maps id/title/stage/topicName, stage null for a challenge with no config yet', async () => {
      challengesService.findAllWithTopic.mockResolvedValue([
        { id: 'c1', title: 'Monte o quadrado', config: fakeConfig('use'), topic: { name: 'Ângulos' } } as any,
        { id: 'c2', title: 'Rascunho', config: {}, topic: { name: 'Ângulos' } } as any,
      ]);

      const result = await service.listChallenges();

      expect(result).toEqual([
        { id: 'c1', title: 'Monte o quadrado', stage: 'use', topicName: 'Ângulos' },
        { id: 'c2', title: 'Rascunho', stage: null, topicName: 'Ângulos' },
      ]);
    });
  });

  describe('getChallengeReport — access/validation', () => {
    it('throws NotFoundException when the challenge does not exist', async () => {
      challengesService.findById.mockResolvedValue(null);

      await expect(service.getChallengeReport('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the challenge config is not set up yet', async () => {
      challengesService.findById.mockResolvedValue({ id: 'c1', config: {} } as any);

      await expect(service.getChallengeReport('c1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getChallengeReport — common block', () => {
    it('returns N=0/nulls everywhere for a challenge with no event yet, never an error/NaN', async () => {
      challengesService.findById.mockResolvedValue({
        id: 'c1',
        topicId: 't1',
        title: 'Desafio vazio',
        config: fakeConfig('create'),
      } as any);
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue([]);

      const result = await service.getChallengeReport('c1');

      expect(result.studentsReached).toBe(0);
      expect(result.studentsCompleted).toBe(0);
      expect(result.attemptsPerStudent).toEqual({
        n: 0,
        mean: null,
        median: null,
        stdDev: null,
        min: null,
        max: null,
        q1: null,
        q3: null,
      });
      expect(result.timeToFirstExecutionMs.n).toBe(0);
      expect(result.modifyInsights).toBeUndefined();
      expect(result.useInsights).toBeUndefined();
    });

    it('includes minSampleSizeThreshold from the current platform settings', async () => {
      challengesService.findById.mockResolvedValue({
        id: 'c1',
        topicId: 't1',
        title: 'D',
        config: fakeConfig('create'),
      } as any);
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue([]);
      settingsService.getOrCreate.mockResolvedValue({
        id: 's1',
        minSampleSizeThreshold: 8,
        updatedAt: new Date(),
      });

      const result = await service.getChallengeReport('c1');

      expect(result.minSampleSizeThreshold).toBe(8);
    });

    it('computes attemptsPerStudent/attemptsHistogram/studentsCompleted from the 6.1 progress map', async () => {
      challengesService.findById.mockResolvedValue({
        id: 'c1',
        topicId: 't1',
        title: 'D',
        config: fakeConfig('create'),
      } as any);
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue(['p1', 'p2', 'p3']);
      metricsService.getChallengeProgressForStudents.mockResolvedValue(
        new Map([
          ['p1', { status: 'completed', attempts: 2 }],
          ['p2', { status: 'in_progress', attempts: 1 }],
          ['p3', { status: 'not_started', attempts: 0 }],
        ]),
      );

      const result = await service.getChallengeReport('c1');

      expect(result.studentsReached).toBe(3);
      expect(result.studentsCompleted).toBe(1);
      expect(result.attemptsPerStudent.n).toBe(3);
      expect(result.attemptsPerStudent.mean).toBeCloseTo(1, 8);
      expect(result.attemptsHistogram).toEqual([
        { label: '1', count: 1 },
        { label: '2', count: 1 },
        { label: '3', count: 0 },
        { label: '4+', count: 0 },
      ]);
    });

    it('resolves nextChallengeId from the topic sibling sequence and passes it to the 6.1 engine', async () => {
      challengesService.findById.mockResolvedValue({
        id: 'c2',
        topicId: 't1',
        title: 'D',
        config: fakeConfig('modify'),
      } as any);
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue([]);
      challengesService.findByTopicIdOrdered.mockResolvedValue([
        { id: 'c1' } as any,
        { id: 'c2' } as any,
        { id: 'c3' } as any,
      ]);

      await service.getChallengeReport('c2');

      expect(metricsService.getChallengeProgressForStudents).toHaveBeenCalledWith([], {
        challengeId: 'c2',
        stage: 'modify',
        nextChallengeId: 'c3',
      });
    });

    it('computes timeToFirstExecutionMs only for students with both a first event and a first execution', async () => {
      challengesService.findById.mockResolvedValue({
        id: 'c1',
        topicId: 't1',
        title: 'D',
        config: fakeConfig('create'),
      } as any);
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue(['p1', 'p2']);
      eventsService.findEarliestEventTimestamps.mockImplementation(async (_challengeId, type) => {
        if (!type) {
          return new Map([
            ['p1', new Date('2026-01-01T10:00:00Z')],
            ['p2', new Date('2026-01-01T10:00:00Z')],
          ]);
        }
        // p2 never executed — only p1 has a first `program_executed`.
        return new Map([['p1', new Date('2026-01-01T10:00:05Z')]]);
      });

      const result = await service.getChallengeReport('c1');

      expect(result.timeToFirstExecutionMs.n).toBe(1);
      expect(result.timeToFirstExecutionMs.mean).toBe(5000);
    });

    it('maps eventsByType raw rows into label/count buckets', async () => {
      challengesService.findById.mockResolvedValue({
        id: 'c1',
        topicId: 't1',
        title: 'D',
        config: fakeConfig('create'),
      } as any);
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue([]);
      eventsService.countEventsByTypeForChallenge.mockResolvedValue([
        { type: 'program_executed', count: 5 },
      ]);

      const result = await service.getChallengeReport('c1');

      expect(result.eventsByType).toEqual([{ label: 'program_executed', count: 5 }]);
    });
  });

  describe('getChallengeReport — stage gating', () => {
    const baseChallenge = { id: 'c1', topicId: 't1', title: 'D' };

    it('includes only modifyInsights for a stage "modify" challenge', async () => {
      challengesService.findById.mockResolvedValue({ ...baseChallenge, config: fakeConfig('modify') } as any);
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue([]);

      const result = await service.getChallengeReport('c1');

      expect(result.modifyInsights).toBeDefined();
      expect(result.useInsights).toBeUndefined();
    });

    it('includes only useInsights for a stage "use" challenge', async () => {
      challengesService.findById.mockResolvedValue({ ...baseChallenge, config: fakeConfig('use') } as any);
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue([]);

      const result = await service.getChallengeReport('c1');

      expect(result.useInsights).toBeDefined();
      expect(result.modifyInsights).toBeUndefined();
    });

    it('includes neither block for a stage "create" challenge (AC de 6.5)', async () => {
      challengesService.findById.mockResolvedValue({ ...baseChallenge, config: fakeConfig('create') } as any);
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue([]);

      const result = await service.getChallengeReport('c1');

      expect(result.modifyInsights).toBeUndefined();
      expect(result.useInsights).toBeUndefined();
    });
  });

  describe('getChallengeReport — modifyInsights', () => {
    beforeEach(() => {
      challengesService.findById.mockResolvedValue({
        id: 'c1',
        topicId: 't1',
        title: 'D',
        config: fakeConfig('modify'),
      } as any);
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue(['p1', 'p2']);
    });

    it('computes attemptsUntilMatch only over students who eventually matched', async () => {
      eventsService.findModifyAttempts.mockResolvedValue([
        fakeEvent('p1', { changed_values: ['TIMES'], prediction_given: 4, result_matched_prediction: false }),
        fakeEvent('p1', {
          changed_values: ['TIMES', 'ANGLE'],
          prediction_given: 4,
          result_matched_prediction: true,
        }),
        fakeEvent('p2', { changed_values: ['ANGLE'], prediction_given: 3, result_matched_prediction: true }),
      ]);

      const result = await service.getChallengeReport('c1');

      // p1 matched on their 2nd attempt, p2 on their 1st.
      expect(result.modifyInsights!.attemptsUntilMatch.n).toBe(2);
      expect(result.modifyInsights!.attemptsUntilMatch.mean).toBeCloseTo(1.5, 8);
    });

    it('computes aggregate and per-student prediction match rate as two distinct numbers', async () => {
      eventsService.findModifyAttempts.mockResolvedValue([
        fakeEvent('p1', { changed_values: ['TIMES'], prediction_given: 4, result_matched_prediction: false }),
        fakeEvent('p1', {
          changed_values: ['TIMES', 'ANGLE'],
          prediction_given: 4,
          result_matched_prediction: true,
        }),
        fakeEvent('p2', { changed_values: ['ANGLE'], prediction_given: 3, result_matched_prediction: true }),
      ]);

      const result = await service.getChallengeReport('c1');

      // Aggregate: 2 matched out of 3 total attempts.
      expect(result.modifyInsights!.predictionMatchRate.aggregate).toEqual({
        n: 3,
        ratePercent: (2 / 3) * 100,
      });
      // Per-student: p1 = 50%, p2 = 100% — mean of the two RATES, not of the raw counts.
      expect(result.modifyInsights!.predictionMatchRate.perStudent.n).toBe(2);
      expect(result.modifyInsights!.predictionMatchRate.perStudent.meanPercent).toBeCloseTo(75, 8);
    });

    it('builds the full frequency table of changed fields across every attempt, not just the mode', async () => {
      eventsService.findModifyAttempts.mockResolvedValue([
        fakeEvent('p1', { changed_values: ['TIMES'], prediction_given: 4, result_matched_prediction: false }),
        fakeEvent('p1', { changed_values: ['TIMES', 'ANGLE'], prediction_given: 4, result_matched_prediction: true }),
        fakeEvent('p2', { changed_values: ['ANGLE'], prediction_given: 3, result_matched_prediction: true }),
      ]);

      const result = await service.getChallengeReport('c1');

      expect(result.modifyInsights!.mostChangedFieldDistribution).toEqual([
        { label: 'ANGLE', count: 2 },
        { label: 'TIMES', count: 2 },
      ]);
    });

    it('produces one scatter point per student (attempts × their individual match rate)', async () => {
      eventsService.findModifyAttempts.mockResolvedValue([
        fakeEvent('p1', { changed_values: ['TIMES'], prediction_given: 4, result_matched_prediction: false }),
        fakeEvent('p1', { changed_values: ['TIMES'], prediction_given: 4, result_matched_prediction: true }),
        fakeEvent('p2', { changed_values: ['ANGLE'], prediction_given: 3, result_matched_prediction: true }),
      ]);

      const result = await service.getChallengeReport('c1');

      expect(result.modifyInsights!.attemptsVsMatchRateScatter).toEqual([
        { attempts: 2, matchRatePercent: 50 },
        { attempts: 1, matchRatePercent: 100 },
      ]);
    });

    it('returns zeros/empty arrays, never an error, when there is no modify attempt yet', async () => {
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue([]);
      eventsService.findModifyAttempts.mockResolvedValue([]);

      const result = await service.getChallengeReport('c1');

      expect(result.modifyInsights!.attemptsUntilMatch.n).toBe(0);
      expect(result.modifyInsights!.predictionMatchRate.aggregate).toEqual({ n: 0, ratePercent: null });
      expect(result.modifyInsights!.mostChangedFieldDistribution).toEqual([]);
      expect(result.modifyInsights!.attemptsVsMatchRateScatter).toEqual([]);
    });
  });

  describe('getChallengeReport — useInsights', () => {
    beforeEach(() => {
      challengesService.findById.mockResolvedValue({
        id: 'c1',
        topicId: 't1',
        title: 'D',
        config: fakeConfig('use'),
      } as any);
      eventsService.findDistinctStudentsForChallenge.mockResolvedValue(['p1', 'p2']);
    });

    it('computes attemptsBeforeProceed from the RD-P challenge_use_completed rows', async () => {
      eventsService.findUseCompletions.mockResolvedValue([
        fakeEvent('p1', { attempts_before_proceed: 2, investigation_answer: 'porque sim' }),
        fakeEvent('p2', { attempts_before_proceed: 4, investigation_answer: null }),
      ]);

      const result = await service.getChallengeReport('c1');

      expect(result.useInsights!.attemptsBeforeProceed.n).toBe(2);
      expect(result.useInsights!.attemptsBeforeProceed.mean).toBe(3);
    });

    it('counts investigationResponses only for a non-empty answer', async () => {
      eventsService.findUseCompletions.mockResolvedValue([
        fakeEvent('p1', { attempts_before_proceed: 1, investigation_answer: 'resposta real' }),
        fakeEvent('p2', { attempts_before_proceed: 1, investigation_answer: '' }),
      ]);

      const result = await service.getChallengeReport('c1');

      expect(result.useInsights!.investigationResponses).toEqual({ n: 1 });
    });

    it('computes aggregate and per-student prediction match rate from program_executed rows', async () => {
      eventsService.findExecutionsWithPrediction.mockResolvedValue([
        fakeEvent('p1', { prediction_given: 4, result_matched_prediction: true }),
        fakeEvent('p1', { prediction_given: 4, result_matched_prediction: true }),
        fakeEvent('p2', { prediction_given: 3, result_matched_prediction: false }),
      ]);

      const result = await service.getChallengeReport('c1');

      expect(result.useInsights!.predictionMatchRate.aggregate).toEqual({
        n: 3,
        ratePercent: (2 / 3) * 100,
      });
      expect(result.useInsights!.predictionMatchRate.perStudent.n).toBe(2);
      // p1 = 100%, p2 = 0% → mean 50%.
      expect(result.useInsights!.predictionMatchRate.perStudent.meanPercent).toBe(50);
    });
  });
});
