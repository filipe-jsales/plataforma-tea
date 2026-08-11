import { Repository } from 'typeorm';
import { ChallengeViewsService } from './challenge-views.service';
import { StudentChallengeView } from './entities/student-challenge-view.entity';

describe('ChallengeViewsService', () => {
  let service: ChallengeViewsService;
  let repository: jest.Mocked<Repository<StudentChallengeView>>;

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<StudentChallengeView>>;

    service = new ChallengeViewsService(repository);
  });

  describe('findViewedChallengeIds', () => {
    it('returns an empty set without querying when the challenge list is empty', async () => {
      const result = await service.findViewedChallengeIds('student-1', []);

      expect(result).toEqual(new Set());
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('returns only the ids the student has already viewed', async () => {
      repository.find.mockResolvedValue([
        { challengeId: 'c1' } as StudentChallengeView,
      ]);

      const result = await service.findViewedChallengeIds('student-1', ['c1', 'c2']);

      expect(result).toEqual(new Set(['c1']));
    });
  });

  describe('markViewed', () => {
    it('creates a view row on first call', async () => {
      repository.findOne.mockResolvedValue(null);
      const created = {} as StudentChallengeView;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.markViewed('student-1', 'challenge-1');

      expect(repository.create).toHaveBeenCalledWith({
        studentId: 'student-1',
        challengeId: 'challenge-1',
      });
      expect(repository.save).toHaveBeenCalledWith(created);
    });

    it('AC2 — is a no-op on a second call for the same student+challenge, never a duplicate row', async () => {
      repository.findOne.mockResolvedValue({} as StudentChallengeView);

      await service.markViewed('student-1', 'challenge-1');

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('swallows a race-condition unique-constraint failure instead of throwing', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({} as StudentChallengeView);
      repository.save.mockRejectedValue(new Error('duplicate key value violates unique constraint'));

      await expect(service.markViewed('student-1', 'challenge-1')).resolves.toBeUndefined();
    });
  });
});
