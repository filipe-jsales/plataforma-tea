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
      findAndCount: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
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

  describe('findPaginated', () => {
    it('filters by role and active only when provided', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findPaginated({
        role: Role.TEACHER,
        active: true,
        page: 2,
        pageSize: 10,
      });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { role: Role.TEACHER, active: true },
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 10,
      });
    });

    it('omits the where filters entirely when role/active are not passed', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findPaginated({ page: 1, pageSize: 20 });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('createStaffUser', () => {
    it('never sets a passwordHash, and generates a password-setup token with an expiry', async () => {
      repository.create.mockImplementation((input) => input as User);
      repository.save.mockImplementation(async (u) => u as User);

      const result = await service.createStaffUser({
        displayName: 'Prof. Ana',
        email: 'ana@escola.com',
        role: Role.TEACHER,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'Prof. Ana',
          email: 'ana@escola.com',
          role: Role.TEACHER,
          totpSecret: null,
        }),
      );
      const createArg = repository.create.mock.calls[0][0] as User;
      expect(typeof createArg.passwordSetupToken).toBe('string');
      expect(createArg.passwordSetupTokenExpiresAt!.getTime()).toBeGreaterThan(
        Date.now(),
      );
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('persists the given totpSecret for role=admin', async () => {
      repository.create.mockImplementation((input) => input as User);
      repository.save.mockImplementation(async (u) => u as User);

      await service.createStaffUser({
        displayName: 'Admin Ana',
        email: 'admin-ana@escola.com',
        role: Role.ADMIN,
        totpSecret: 'SECRETVALUE',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ totpSecret: 'SECRETVALUE' }),
      );
    });
  });

  describe('createPendingStudent (A2)', () => {
    it('creates the user with role=student, active=false, and no login credential yet', async () => {
      repository.create.mockImplementation((input) => input as User);
      repository.save.mockImplementation(async (u) => u as User);

      const result = await service.createPendingStudent({
        displayName: 'Aluno Teste',
        avatarId: 'avatar-1',
      });

      expect(repository.create).toHaveBeenCalledWith({
        displayName: 'Aluno Teste',
        role: Role.STUDENT,
        avatarId: 'avatar-1',
        active: false,
      });
      expect(result.role).toBe(Role.STUDENT);
    });
  });

  describe('activateStudentCredential (A2)', () => {
    it('returns null without saving when the student does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.activateStudentCredential('missing', [
        'img-1',
        'img-2',
        'img-3',
      ]);

      expect(result).toBeNull();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('sets loginImageSequence and flips active to true — never before this point', async () => {
      const user = {
        id: 'student-1',
        active: false,
        loginImageSequence: null,
      } as unknown as User;
      repository.findOne.mockResolvedValue(user);
      repository.save.mockImplementation(async (u) => u as User);

      const result = await service.activateStudentCredential('student-1', [
        'img-1',
        'img-2',
        'img-3',
      ]);

      expect(result?.active).toBe(true);
      expect(result?.loginImageSequence).toEqual(['img-1', 'img-2', 'img-3']);
    });
  });

  describe('updateProfile', () => {
    it('returns null without saving when the user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.updateProfile('missing', {
        displayName: 'Novo nome',
      });

      expect(result).toBeNull();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('never touches avatarId/loginImageSequence — student credential is out of scope (flow 1.3)', async () => {
      const user = {
        id: 'user-1',
        displayName: 'Antigo',
        email: 'old@escola.com',
        role: Role.TEACHER,
        avatarId: 'avatar-1',
      } as User;
      repository.findOne.mockResolvedValue(user);
      repository.save.mockImplementation(async (u) => u as User);

      const result = await service.updateProfile('user-1', {
        displayName: 'Novo nome',
        email: 'new@escola.com',
      });

      expect(result?.displayName).toBe('Novo nome');
      expect(result?.email).toBe('new@escola.com');
      expect(result?.avatarId).toBe('avatar-1');
    });
  });

  describe('setActive', () => {
    it('returns null without saving when the user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.setActive('missing', false);

      expect(result).toBeNull();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('flips active and persists it (blocks login immediately per AuthService)', async () => {
      const user = { id: 'user-1', active: true } as User;
      repository.findOne.mockResolvedValue(user);
      repository.save.mockImplementation(async (u) => u as User);

      const result = await service.setActive('user-1', false);

      expect(result?.active).toBe(false);
    });
  });

  describe('setPasswordHash', () => {
    it('clears the setup token when the password is set', async () => {
      await service.setPasswordHash('user-1', 'hashed-value');

      expect(repository.update).toHaveBeenCalledWith('user-1', {
        passwordHash: 'hashed-value',
        passwordSetupToken: null,
        passwordSetupTokenExpiresAt: null,
      });
    });
  });
});
