import { BadRequestException, NotFoundException } from '@nestjs/common';
import { generateSecret, generateURI } from 'otplib';
import { AdminUsersService } from './admin-users.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '../common/enums/role.enum';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
}));

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let usersService: jest.Mocked<UsersService>;
  let auditService: jest.Mocked<AuditService>;

  const actor = { id: 'admin-1', role: Role.ADMIN };

  const baseUser: Partial<User> = {
    id: 'user-1',
    pseudonymId: 'pseudo-1',
    displayName: 'Prof. Ana',
    email: 'ana@escola.com',
    role: Role.TEACHER,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findPaginated: jest.fn(),
      createStaffUser: jest.fn(),
      updateProfile: jest.fn(),
      setActive: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    auditService = {
      recordUserAction: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    service = new AdminUsersService(usersService, auditService);
    jest.clearAllMocks();
    auditService.recordUserAction.mockResolvedValue(undefined as never);
  });

  describe('list', () => {
    it('maps paginated users to profiles, never leaking passwordHash/totpSecret', async () => {
      usersService.findPaginated.mockResolvedValue({
        items: [
          {
            ...baseUser,
            passwordHash: 'secret-hash',
            totpSecret: 'secret-totp',
          } as User,
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      });

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.items).toEqual([
        {
          id: 'user-1',
          pseudonymId: 'pseudo-1',
          displayName: 'Prof. Ana',
          email: 'ana@escola.com',
          role: Role.TEACHER,
          active: true,
          createdAt: baseUser.createdAt,
        },
      ]);
      expect(JSON.stringify(result.items)).not.toMatch(
        /secret-hash|secret-totp/,
      );
    });
  });

  describe('create', () => {
    it('rejects when the email is already in use', async () => {
      usersService.findByEmail.mockResolvedValue(baseUser as User);

      await expect(
        service.create(
          { displayName: 'Nova', email: 'ana@escola.com', role: Role.TEACHER },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersService.createStaffUser).not.toHaveBeenCalled();
    });

    it('creates a teacher without generating a TOTP secret', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.createStaffUser.mockResolvedValue({
        ...baseUser,
        passwordSetupToken: 'token-123',
      } as User);

      const result = await service.create(
        {
          displayName: 'Prof. Ana',
          email: 'ana@escola.com',
          role: Role.TEACHER,
        },
        actor,
      );

      expect(generateSecret).not.toHaveBeenCalled();
      expect(usersService.createStaffUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.TEACHER, totpSecret: null }),
      );
      expect(result.passwordSetupToken).toBe('token-123');
      expect(result.totpOtpauthUri).toBeNull();
    });

    it('generates and returns a TOTP secret URI for role=admin', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (generateSecret as jest.Mock).mockReturnValue('TOTPSECRET');
      (generateURI as jest.Mock).mockReturnValue('otpauth://totp/...');
      usersService.createStaffUser.mockResolvedValue({
        ...baseUser,
        role: Role.ADMIN,
        passwordSetupToken: 'token-456',
      } as User);

      const result = await service.create(
        { displayName: 'Admin Bia', email: 'bia@escola.com', role: Role.ADMIN },
        actor,
      );

      expect(usersService.createStaffUser).toHaveBeenCalledWith(
        expect.objectContaining({ totpSecret: 'TOTPSECRET' }),
      );
      expect(result.totpOtpauthUri).toBe('otpauth://totp/...');
    });

    it('1.4 — audits the creation (quem, quando, o quê)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.createStaffUser.mockResolvedValue({
        ...baseUser,
        passwordSetupToken: 'token-123',
      } as User);

      await service.create(
        {
          displayName: 'Prof. Ana',
          email: 'ana@escola.com',
          role: Role.TEACHER,
        },
        actor,
      );

      expect(auditService.recordUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-1',
          actorRole: Role.ADMIN,
          actionType: 'create',
          targetRole: Role.TEACHER,
        }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the target user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.update('missing', { displayName: 'X' }, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects setting an email on a student account', async () => {
      usersService.findById.mockResolvedValue({
        ...baseUser,
        role: Role.STUDENT,
      } as User);

      await expect(
        service.update('user-1', { email: 'aluno@escola.com' }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersService.updateProfile).not.toHaveBeenCalled();
    });

    it('updates and audits the change', async () => {
      usersService.findById.mockResolvedValue(baseUser as User);
      usersService.updateProfile.mockResolvedValue({
        ...baseUser,
        displayName: 'Novo nome',
      } as User);

      const result = await service.update(
        'user-1',
        { displayName: 'Novo nome' },
        actor,
      );

      expect(result.displayName).toBe('Novo nome');
      expect(auditService.recordUserAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'edit', targetUserId: 'user-1' }),
      );
    });
  });

  describe('setActive', () => {
    it('throws NotFoundException when the target user does not exist', async () => {
      usersService.setActive.mockResolvedValue(null);

      await expect(
        service.setActive('missing', false, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('audits deactivate/activate distinctly', async () => {
      usersService.setActive.mockResolvedValue({
        ...baseUser,
        active: false,
      } as User);

      await service.setActive('user-1', false, actor);

      expect(auditService.recordUserAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'deactivate' }),
      );
    });
  });
});
