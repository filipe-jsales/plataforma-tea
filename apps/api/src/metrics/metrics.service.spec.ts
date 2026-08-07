import { EventsService } from '../events/events.service';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(() => {
    eventsService = {
      countAttemptsByStudents: jest.fn(),
      findStudentsWithEvent: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;

    service = new MetricsService(eventsService);
  });

  describe('getChallengeProgressForStudents', () => {
    it('returns an empty map without querying when pseudoIds is empty', async () => {
      const result = await service.getChallengeProgressForStudents([], {
        challengeId: 'c1',
        stage: 'use',
        nextChallengeId: 'c2',
      });

      expect(result).toEqual(new Map());
      expect(eventsService.countAttemptsByStudents).not.toHaveBeenCalled();
      expect(eventsService.findStudentsWithEvent).not.toHaveBeenCalled();
    });

    describe('stage "use"', () => {
      it('marks a student not_started with 0 attempts and no completion event', async () => {
        eventsService.countAttemptsByStudents.mockResolvedValue(new Map());
        eventsService.findStudentsWithEvent.mockResolvedValue(new Set());

        const result = await service.getChallengeProgressForStudents(['p1'], {
          challengeId: 'c1',
          stage: 'use',
          nextChallengeId: 'c2',
        });

        expect(result.get('p1')).toEqual({ status: 'not_started', attempts: 0 });
      });

      it('marks a student in_progress once they have attempts but no challenge_use_completed', async () => {
        eventsService.countAttemptsByStudents.mockResolvedValue(new Map([['p1', 2]]));
        eventsService.findStudentsWithEvent.mockResolvedValue(new Set());

        const result = await service.getChallengeProgressForStudents(['p1'], {
          challengeId: 'c1',
          stage: 'use',
          nextChallengeId: 'c2',
        });

        expect(result.get('p1')).toEqual({ status: 'in_progress', attempts: 2 });
        expect(eventsService.findStudentsWithEvent).toHaveBeenCalledWith(
          ['p1'],
          'c1',
          'challenge_use_completed',
        );
      });

      it('marks a student completed once challenge_use_completed exists', async () => {
        eventsService.countAttemptsByStudents.mockResolvedValue(new Map([['p1', 1]]));
        eventsService.findStudentsWithEvent.mockResolvedValue(new Set(['p1']));

        const result = await service.getChallengeProgressForStudents(['p1'], {
          challengeId: 'c1',
          stage: 'use',
          nextChallengeId: 'c2',
        });

        expect(result.get('p1')).toEqual({ status: 'completed', attempts: 1 });
      });
    });

    describe('stage "create"', () => {
      it('resolves completion via challenge.completed, not challenge_use_completed', async () => {
        eventsService.countAttemptsByStudents.mockResolvedValue(new Map([['p1', 3]]));
        eventsService.findStudentsWithEvent.mockResolvedValue(new Set(['p1']));

        const result = await service.getChallengeProgressForStudents(['p1'], {
          challengeId: 'c3',
          stage: 'create',
          nextChallengeId: null,
        });

        expect(eventsService.findStudentsWithEvent).toHaveBeenCalledWith(
          ['p1'],
          'c3',
          'challenge.completed',
        );
        expect(result.get('p1')).toEqual({ status: 'completed', attempts: 3 });
      });
    });

    describe('stage "modify" — "completed" is derived from the next (create) challenge, never instrumented', () => {
      it('marks completed when the student has any event on the next challenge, regardless of attempt outcome', async () => {
        eventsService.countAttemptsByStudents.mockResolvedValue(new Map([['p1', 5]]));
        eventsService.findStudentsWithEvent.mockResolvedValue(new Set(['p1']));

        const result = await service.getChallengeProgressForStudents(['p1'], {
          challengeId: 'c2',
          stage: 'modify',
          nextChallengeId: 'c3',
        });

        // Nunca filtra por `type` — qualquer evento no desafio seguinte
        // conta como "saiu do modify", não um tipo específico de "concluiu".
        expect(eventsService.findStudentsWithEvent).toHaveBeenCalledWith(['p1'], 'c3');
        expect(result.get('p1')).toEqual({ status: 'completed', attempts: 5 });
      });

      it('never resolves to completed when there is no next challenge cadastrado yet', async () => {
        eventsService.countAttemptsByStudents.mockResolvedValue(new Map([['p1', 5]]));

        const result = await service.getChallengeProgressForStudents(['p1'], {
          challengeId: 'c2',
          stage: 'modify',
          nextChallengeId: null,
        });

        expect(eventsService.findStudentsWithEvent).not.toHaveBeenCalled();
        expect(result.get('p1')).toEqual({ status: 'in_progress', attempts: 5 });
      });

      it('stays in_progress (never completed) for a student with attempts but no activity on the next challenge yet', async () => {
        eventsService.countAttemptsByStudents.mockResolvedValue(new Map([['p1', 4]]));
        eventsService.findStudentsWithEvent.mockResolvedValue(new Set());

        const result = await service.getChallengeProgressForStudents(['p1'], {
          challengeId: 'c2',
          stage: 'modify',
          nextChallengeId: 'c3',
        });

        expect(result.get('p1')).toEqual({ status: 'in_progress', attempts: 4 });
      });
    });

    it('computes independent status/attempts per student in the same recorte, never leaking one into another', async () => {
      eventsService.countAttemptsByStudents.mockResolvedValue(
        new Map([
          ['p1', 1],
          ['p2', 0],
        ]),
      );
      eventsService.findStudentsWithEvent.mockResolvedValue(new Set(['p1']));

      const result = await service.getChallengeProgressForStudents(['p1', 'p2', 'p3'], {
        challengeId: 'c1',
        stage: 'use',
        nextChallengeId: 'c2',
      });

      expect(result.get('p1')).toEqual({ status: 'completed', attempts: 1 });
      expect(result.get('p2')).toEqual({ status: 'not_started', attempts: 0 });
      expect(result.get('p3')).toEqual({ status: 'not_started', attempts: 0 });
    });
  });
});
