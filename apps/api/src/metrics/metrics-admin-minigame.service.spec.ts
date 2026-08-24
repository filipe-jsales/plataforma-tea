import { EventsService } from '../events/events.service';
import { InteractionEvent } from '../events/entities/interaction-event.entity';
import { MinigamesService } from '../minigames/minigames.service';
import { SettingsService } from '../settings/settings.service';
import { MetricsAdminMiniGameService } from './metrics-admin-minigame.service';

function fakeEvent(studentPseudoId: string): InteractionEvent {
  return { studentPseudoId } as InteractionEvent;
}

describe('MetricsAdminMiniGameService', () => {
  let service: MetricsAdminMiniGameService;
  let minigamesService: jest.Mocked<MinigamesService>;
  let eventsService: jest.Mocked<EventsService>;
  let settingsService: jest.Mocked<SettingsService>;

  beforeEach(() => {
    minigamesService = {
      findAll: jest.fn(),
      findOneOrThrow: jest.fn(),
    } as unknown as jest.Mocked<MinigamesService>;
    eventsService = {
      findDistinctStudentsForMiniGameLevel: jest.fn(),
      findEarliestMiniGameEventTimestamps: jest.fn(),
      countEventsByCategoryForMiniGameLevel: jest.fn(),
      countEventsByTypeForMiniGameLevel: jest.fn(),
      countAttemptsByStudentsForMiniGameLevel: jest.fn(),
      findMiniGameCompletions: jest.fn(),
      findMiniGameAbandonments: jest.fn(),
      findMiniGamePredictAnswers: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;
    settingsService = { getOrCreate: jest.fn() } as unknown as jest.Mocked<SettingsService>;

    settingsService.getOrCreate.mockResolvedValue({
      id: 's1',
      minSampleSizeThreshold: 5,
      updatedAt: new Date(),
    });
    eventsService.findDistinctStudentsForMiniGameLevel.mockResolvedValue([]);
    eventsService.findEarliestMiniGameEventTimestamps.mockResolvedValue(new Map());
    eventsService.countEventsByCategoryForMiniGameLevel.mockResolvedValue({
      'RD-I': 0,
      'RD-P': 0,
      'RD-C': 0,
      'RD-E': 0,
      'RD-L': 0,
    });
    eventsService.countEventsByTypeForMiniGameLevel.mockResolvedValue([]);
    eventsService.countAttemptsByStudentsForMiniGameLevel.mockResolvedValue(new Map());
    eventsService.findMiniGameCompletions.mockResolvedValue([]);
    eventsService.findMiniGameAbandonments.mockResolvedValue([]);
    eventsService.findMiniGamePredictAnswers.mockResolvedValue([]);

    service = new MetricsAdminMiniGameService(minigamesService, eventsService, settingsService);
  });

  describe('listMiniGameLevels', () => {
    it('maps id/title/stage/conceptId from every level', async () => {
      minigamesService.findAll.mockResolvedValue([
        { id: 'l1', title: 'Observe o pedido pronto', stage: 'use', conceptId: 'fractions_equal_parts' } as any,
      ]);

      const result = await service.listMiniGameLevels();

      expect(result).toEqual([
        { id: 'l1', title: 'Observe o pedido pronto', stage: 'use', conceptId: 'fractions_equal_parts' },
      ]);
    });
  });

  describe('getMiniGameLevelReport', () => {
    it('returns N=0/zeros for a level with no events yet, never an error', async () => {
      minigamesService.findOneOrThrow.mockResolvedValue({
        id: 'l1',
        title: 'Observe o pedido pronto',
        stage: 'use',
        conceptId: 'fractions_equal_parts',
      } as any);

      const report = await service.getMiniGameLevelReport('l1');

      expect(report.studentsReached).toBe(0);
      expect(report.studentsCompleted).toBe(0);
      expect(report.roundsPerStudent.n).toBe(0);
      expect(report.abandonmentCount).toBe(0);
      expect(report.predictAnswerRate).toEqual({ n: 0, ratePercent: null });
    });

    it('counts distinct students in completions/abandonments/predict answers, never double-counting repeated events per student', async () => {
      minigamesService.findOneOrThrow.mockResolvedValue({
        id: 'l1',
        title: 'Ajuste a sequência',
        stage: 'modify',
        conceptId: 'fractions_equal_parts',
      } as any);
      eventsService.findDistinctStudentsForMiniGameLevel.mockResolvedValue(['p1', 'p2']);
      eventsService.findMiniGameCompletions.mockResolvedValue([
        fakeEvent('p1'),
        fakeEvent('p1'),
      ]);
      eventsService.findMiniGameAbandonments.mockResolvedValue([fakeEvent('p2')]);
      eventsService.findMiniGamePredictAnswers.mockResolvedValue([fakeEvent('p1')]);
      eventsService.countAttemptsByStudentsForMiniGameLevel.mockResolvedValue(
        new Map([
          ['p1', 3],
          ['p2', 1],
        ]),
      );

      const report = await service.getMiniGameLevelReport('l1');

      expect(report.studentsReached).toBe(2);
      expect(report.studentsCompleted).toBe(1);
      expect(report.abandonmentCount).toBe(1);
      expect(report.roundsPerStudent.n).toBe(2);
      expect(report.predictAnswerRate).toEqual({ n: 2, ratePercent: 50 });
      expect(eventsService.countAttemptsByStudentsForMiniGameLevel).toHaveBeenCalledWith(
        ['p1', 'p2'],
        'l1',
      );
    });
  });
});
