import { Repository } from 'typeorm';
import { GuardianConsent } from './entities/guardian-consent.entity';
import { GuardianConsentsService } from './guardian-consents.service';

describe('GuardianConsentsService', () => {
  let service: GuardianConsentsService;
  let repository: jest.Mocked<Repository<GuardianConsent>>;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<GuardianConsent>>;

    service = new GuardianConsentsService(repository);
  });

  describe('findByStudentId', () => {
    it('loads the collectedBy relation (AC4 needs who registered it)', async () => {
      repository.findOne.mockResolvedValue(null);

      await service.findByStudentId('student-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        relations: { collectedBy: true },
      });
    });
  });

  describe('hasConsent', () => {
    it('returns true when a consent row exists', async () => {
      repository.count.mockResolvedValue(1);

      await expect(service.hasConsent('student-1')).resolves.toBe(true);
    });

    it('returns false when no consent row exists yet (AC3 pending state)', async () => {
      repository.count.mockResolvedValue(0);

      await expect(service.hasConsent('student-1')).resolves.toBe(false);
    });
  });

  describe('recordConsent', () => {
    it('persists the consent exactly as given', async () => {
      const params = {
        studentId: 'student-1',
        guardianName: 'Maria Silva',
        guardianRelationship: 'Mãe',
        guardianContact: '(11) 99999-0000',
        consentedAt: new Date('2026-01-01T10:00:00Z'),
        collectedByUserId: 'teacher-1',
      };
      const created = { id: 'c1', ...params } as GuardianConsent;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.recordConsent(params);

      expect(repository.create).toHaveBeenCalledWith(params);
      expect(result).toBe(created);
    });
  });
});
