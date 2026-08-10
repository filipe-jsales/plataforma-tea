import { Repository } from 'typeorm';
import { ChallengeDraftsService } from './challenge-drafts.service';
import { StudentChallengeDraft } from './entities/student-challenge-draft.entity';

describe('ChallengeDraftsService', () => {
  let service: ChallengeDraftsService;
  let repository: jest.Mocked<Repository<StudentChallengeDraft>>;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<StudentChallengeDraft>>;

    service = new ChallengeDraftsService(repository);
  });

  describe('findByStudentAndChallenge', () => {
    it('scopes the lookup by both studentId and challengeId', async () => {
      repository.findOne.mockResolvedValue(null);

      await service.findByStudentAndChallenge('student-1', 'challenge-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { studentId: 'student-1', challengeId: 'challenge-1' },
      });
    });
  });

  describe('upsert', () => {
    it('creates a new draft when none exists yet', async () => {
      repository.findOne.mockResolvedValue(null);
      const created = { id: 'd1' } as StudentChallengeDraft;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.upsert('student-1', 'challenge-1', { type: 'move_forward' });

      expect(repository.create).toHaveBeenCalledWith({
        studentId: 'student-1',
        challengeId: 'challenge-1',
        workspaceJson: { type: 'move_forward' },
      });
    });

    it('overwrites workspaceJson on an existing draft, never creating a second row', async () => {
      const existing = {
        id: 'd1',
        studentId: 'student-1',
        challengeId: 'challenge-1',
        workspaceJson: { type: 'old' },
      } as StudentChallengeDraft;
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockImplementation(async (d) => d as StudentChallengeDraft);

      const result = await service.upsert('student-1', 'challenge-1', {
        type: 'new',
      });

      expect(repository.create).not.toHaveBeenCalled();
      expect(result.workspaceJson).toEqual({ type: 'new' });
    });

    it('supports workspaceJson: null (an emptied-out workspace is a valid state to save)', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockImplementation((input) => input as StudentChallengeDraft);
      repository.save.mockImplementation(async (d) => d as StudentChallengeDraft);

      const result = await service.upsert('student-1', 'challenge-1', null);

      expect(result.workspaceJson).toBeNull();
    });
  });

  describe('discard', () => {
    it('deletes by studentId+challengeId, idempotently (AC3 — never errors if nothing to discard)', async () => {
      repository.delete.mockResolvedValue({ affected: 0, raw: [] });

      await service.discard('student-1', 'challenge-1');

      expect(repository.delete).toHaveBeenCalledWith({
        studentId: 'student-1',
        challengeId: 'challenge-1',
      });
    });
  });
});
