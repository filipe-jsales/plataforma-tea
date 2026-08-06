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
  };

  beforeEach(() => {
    usersService = {
      findById: jest.fn(),
      findByEmailAndRole: jest.fn(),
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
      schoolsService.findClassroomByJoinCode.mockResolvedValue({ id: 'classroom-1' } as any);
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
      usersService.findById.mockResolvedValue({ ...baseUser, role: Role.TEACHER } as User);

      await expect(
        service.loginStudent({ userId: 'user-1', imageSequence: ['img-a'] } as any),
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
      } as any);

      expect(eventsService.record).toHaveBeenCalledTimes(2);
      expect(eventsService.record).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ type: 'login_attempt', payload: expect.objectContaining({ success: true }) }),
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
  });

  describe('loginTeacher', () => {
    it('rejects with a generic message when no user matches the email/role', async () => {
      usersService.findByEmailAndRole.mockResolvedValue(null);

      await expect(
        service.loginTeacher({ email: 'missing@escola.com', password: 'x' } as any),
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
        service.loginTeacher({ email: 'prof@escola.com', password: 'wrong' } as any),
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
      } as any);

      expect(result.accessToken).toBe('signed-token');
      expect(result.role).toBe(Role.TEACHER);
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
        service.loginAdmin({ email: 'admin@escola.com', password: 'correct', otp: '000000' } as any),
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
      } as any);

      expect(result.role).toBe(Role.ADMIN);
    });
  });
});
