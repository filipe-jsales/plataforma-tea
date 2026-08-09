import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { verify as verifyTotp } from 'otplib';
import { EventCategory } from '../common/enums/event-category.enum';
import { Role } from '../common/enums/role.enum';
import { EventsService } from '../events/events.service';
import { SchoolsService } from '../schools/schools.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';

jest.mock('bcrypt');
jest.mock('otplib', () => ({ verify: jest.fn() }));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let schoolsService: jest.Mocked<SchoolsService>;
  let eventsService: jest.Mocked<EventsService>;
  let jwtService: { sign: jest.Mock };

  const baseUser: Partial<User> = {
    id: 'user-1',
    pseudonymId: 'pseudo-1',
    role: Role.STUDENT,
    displayName: 'Aluno Um',
    loginImageSequence: ['img-a', 'img-b', 'img-c'],
    active: true,
  };

  beforeEach(() => {
    usersService = {
      findById: jest.fn(),
      findByEmailAndRole: jest.fn(),
      findByPasswordSetupToken: jest.fn(),
      setPasswordHash: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    schoolsService = {
      findClassroomByJoinCode: jest.fn(),
      findActiveStudentsInClassroom: jest.fn(),
    } as unknown as jest.Mocked<SchoolsService>;

    eventsService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventsService>;

    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };

    service = new AuthService(
      usersService,
      schoolsService,
      eventsService,
      jwtService as any,
    );

    jest.clearAllMocks();
    jwtService.sign.mockReturnValue('signed-token');
    eventsService.record.mockResolvedValue(undefined as never);
  });

  describe('getClassroomRoster', () => {
    it('throws NotFoundException when join code does not match a classroom', async () => {
      schoolsService.findClassroomByJoinCode.mockResolvedValue(null);

      await expect(service.getClassroomRoster('AZUL-7')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('never exposes email, pseudonym or reversible identity in the roster', async () => {
      schoolsService.findClassroomByJoinCode.mockResolvedValue({
        id: 'classroom-1',
      } as any);
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        {
          student: {
            id: 'student-1',
            displayName: 'Aluno Um',
            avatar: { label: 'Gato', assetRef: 'gato.svg' },
          },
        },
        {
          student: {
            id: 'student-2',
            displayName: 'Aluno Dois',
            avatar: null,
          },
        },
      ] as any);

      const roster = await service.getClassroomRoster('AZUL-7');

      expect(roster).toEqual([
        {
          userId: 'student-1',
          displayName: 'Aluno Um',
          avatar: { label: 'Gato', assetRef: 'gato.svg' },
        },
        { userId: 'student-2', displayName: 'Aluno Dois', avatar: null },
      ]);
      expect(JSON.stringify(roster)).not.toMatch(/pseudo|email/i);
    });
  });

  describe('loginStudent', () => {
    it('rejects when the user id does not resolve to a student', async () => {
      usersService.findById.mockResolvedValue({
        ...baseUser,
        role: Role.TEACHER,
      } as User);

      await expect(
        service.loginStudent({
          userId: 'user-1',
          imageSequence: ['img-a'],
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(eventsService.record).not.toHaveBeenCalled();
    });

    it('records an interaction event and rejects on a wrong image sequence', async () => {
      usersService.findById.mockResolvedValue(baseUser as User);

      await expect(
        service.loginStudent({
          userId: 'user-1',
          imageSequence: ['img-a', 'img-b', 'wrong'],
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(eventsService.record).toHaveBeenCalledTimes(1);
      expect(eventsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          studentPseudoId: 'pseudo-1',
          category: EventCategory.INTERACTION,
          type: 'login_attempt',
          payload: expect.objectContaining({ success: false }),
        }),
      );
    });

    it('logs interaction + longitudinal success events and issues a token on a matching sequence', async () => {
      usersService.findById.mockResolvedValue(baseUser as User);

      const result = await service.loginStudent({
        userId: 'user-1',
        imageSequence: ['img-a', 'img-b', 'img-c'],
      });

      expect(eventsService.record).toHaveBeenCalledTimes(2);
      expect(eventsService.record).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: 'login_attempt',
          payload: expect.objectContaining({ success: true }),
        }),
      );
      expect(eventsService.record).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          category: EventCategory.LONGITUDINAL,
          type: 'login_success',
        }),
      );
      expect(result).toEqual({
        accessToken: 'signed-token',
        role: Role.STUDENT,
        displayName: 'Aluno Um',
      });
    });

    it('1.4 — rejects a deactivated student before comparing the image sequence', async () => {
      usersService.findById.mockResolvedValue({
        ...baseUser,
        active: false,
      } as User);

      await expect(
        service.loginStudent({
          userId: 'user-1',
          imageSequence: ['img-a', 'img-b', 'img-c'],
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(eventsService.record).not.toHaveBeenCalled();
    });
  });

  describe('loginTeacher', () => {
    it('rejects with a generic message when no user matches the email/role', async () => {
      usersService.findByEmailAndRole.mockResolvedValue(null);

      await expect(
        service.loginTeacher({
          email: 'missing@escola.com',
          password: 'x',
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when the password hash does not match', async () => {
      usersService.findByEmailAndRole.mockResolvedValue({
        ...baseUser,
        role: Role.TEACHER,
        passwordHash: 'hash',
      } as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.loginTeacher({
          email: 'prof@escola.com',
          password: 'wrong',
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues a token when the password matches', async () => {
      usersService.findByEmailAndRole.mockResolvedValue({
        ...baseUser,
        role: Role.TEACHER,
        passwordHash: 'hash',
      } as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.loginTeacher({
        email: 'prof@escola.com',
        password: 'correct',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.role).toBe(Role.TEACHER);
    });

    it('1.4 — rejects a correct password when the account was deactivated by an admin', async () => {
      usersService.findByEmailAndRole.mockResolvedValue({
        ...baseUser,
        role: Role.TEACHER,
        passwordHash: 'hash',
        active: false,
      } as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.loginTeacher({
          email: 'prof@escola.com',
          password: 'correct',
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('loginAdmin', () => {
    it('rejects when the password matches but the TOTP code is invalid', async () => {
      usersService.findByEmailAndRole.mockResolvedValue({
        ...baseUser,
        role: Role.ADMIN,
        passwordHash: 'hash',
        totpSecret: 'secret',
      } as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (verifyTotp as jest.Mock).mockResolvedValue({ valid: false });

      await expect(
        service.loginAdmin({
          email: 'admin@escola.com',
          password: 'correct',
          otp: '000000',
        } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('issues a token when both password and TOTP are valid', async () => {
      usersService.findByEmailAndRole.mockResolvedValue({
        ...baseUser,
        role: Role.ADMIN,
        passwordHash: 'hash',
        totpSecret: 'secret',
      } as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (verifyTotp as jest.Mock).mockResolvedValue({ valid: true });

      const result = await service.loginAdmin({
        email: 'admin@escola.com',
        password: 'correct',
        otp: '123456',
      });

      expect(result.role).toBe(Role.ADMIN);
    });
  });

  describe('setPassword', () => {
    it('rejects when the token does not match any user', async () => {
      usersService.findByPasswordSetupToken.mockResolvedValue(null);

      await expect(
        service.setPassword('bad-token', 'new-password123'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(usersService.setPasswordHash).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      usersService.findByPasswordSetupToken.mockResolvedValue({
        ...baseUser,
        id: 'user-2',
        passwordSetupTokenExpiresAt: new Date(Date.now() - 1000),
      } as User);

      await expect(
        service.setPassword('expired-token', 'new-password123'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(usersService.setPasswordHash).not.toHaveBeenCalled();
    });

    it('hashes the password and persists it via UsersService when the token is valid', async () => {
      usersService.findByPasswordSetupToken.mockResolvedValue({
        ...baseUser,
        id: 'user-2',
        passwordSetupTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      } as User);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await service.setPassword('good-token', 'new-password123');

      expect(usersService.setPasswordHash).toHaveBeenCalledWith(
        'user-2',
        'hashed-password',
      );
    });
  });
});
