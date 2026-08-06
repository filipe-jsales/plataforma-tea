import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    service = new UsersService(repository);
  });

  it('findByEmailAndRole scopes the lookup by both email and role', async () => {
    repository.findOne.mockResolvedValue(null);

    await service.findByEmailAndRole('prof@escola.com', Role.TEACHER);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { email: 'prof@escola.com', role: Role.TEACHER },
    });
  });

  it('findById returns null without saving when the user does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    const result = await service.updateSensoryProfile('missing', {
      soundEnabled: true,
      animationEnabled: true,
    });

    expect(result).toBeNull();
    expect(repository.save).not.toHaveBeenCalled();
  });

  describe('updateSensoryProfile', () => {
    it('sets sensoryOnboardingCompletedAt only on the first completion', async () => {
      const user = {
        id: 'user-1',
        soundEnabled: false,
        animationEnabled: false,
        sensoryOnboardingCompletedAt: null,
      } as User;
      repository.findOne.mockResolvedValue(user);
      repository.save.mockImplementation(async (u) => u as User);

      const result = await service.updateSensoryProfile('user-1', {
        soundEnabled: true,
        animationEnabled: false,
      });

      expect(result?.soundEnabled).toBe(true);
      expect(result?.animationEnabled).toBe(false);
      expect(result?.sensoryOnboardingCompletedAt).toBeInstanceOf(Date);
    });

    it('does not overwrite an already-recorded onboarding timestamp', async () => {
      const originalDate = new Date('2026-01-01T00:00:00Z');
      const user = {
        id: 'user-1',
        soundEnabled: false,
        animationEnabled: false,
        sensoryOnboardingCompletedAt: originalDate,
      } as User;
      repository.findOne.mockResolvedValue(user);
      repository.save.mockImplementation(async (u) => u as User);

      const result = await service.updateSensoryProfile('user-1', {
        soundEnabled: true,
        animationEnabled: true,
      });

      expect(result?.sensoryOnboardingCompletedAt).toBe(originalDate);
    });
  });
});
