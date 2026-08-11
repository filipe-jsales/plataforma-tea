import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventCategory } from '../common/enums/event-category.enum';
import { IllustrationKind } from '../common/enums/illustration-kind.enum';
import { Role } from '../common/enums/role.enum';
import { EventsService } from '../events/events.service';
import { GuardianConsent } from '../guardian-consents/entities/guardian-consent.entity';
import { GuardianConsentsService } from '../guardian-consents/guardian-consents.service';
import { Illustration } from '../illustrations/entities/illustration.entity';
import { IllustrationsService } from '../illustrations/illustrations.service';
import { Classroom } from '../schools/entities/classroom.entity';
import { Enrollment } from '../schools/entities/enrollment.entity';
import { SchoolsService } from '../schools/schools.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { StudentAccountsService } from './student-accounts.service';

describe('StudentAccountsService', () => {
  let service: StudentAccountsService;
  let usersService: jest.Mocked<UsersService>;
  let schoolsService: jest.Mocked<SchoolsService>;
  let illustrationsService: jest.Mocked<IllustrationsService>;
  let eventsService: jest.Mocked<EventsService>;
  let guardianConsentsService: jest.Mocked<GuardianConsentsService>;

  const ownClassroom = {
    id: 'classroom-1',
    name: 'Turma A',
    joinCode: 'AZUL-1',
    teacherId: 'teacher-1',
  } as Classroom;
  const otherTeacherClassroom = {
    id: 'classroom-2',
    name: 'Turma B',
    joinCode: 'AZUL-2',
    teacherId: 'teacher-2',
  } as Classroom;

  const avatarCatalog = [
    {
      id: 'avatar-1',
      label: 'Gato',
      assetRef: 'gato.svg',
      kind: IllustrationKind.AVATAR,
    } as Illustration,
    {
      id: 'avatar-2',
      label: 'Cachorro',
      assetRef: 'cachorro.svg',
      kind: IllustrationKind.AVATAR,
    } as Illustration,
  ];
  const loginImages = [
    { id: 'img-1', label: 'Sol', assetRef: 'sol.svg' } as Illustration,
    { id: 'img-2', label: 'Lua', assetRef: 'lua.svg' } as Illustration,
    { id: 'img-3', label: 'Estrela', assetRef: 'estrela.svg' } as Illustration,
  ];

  const pendingStudent = {
    id: 'student-1',
    displayName: 'Aluno Teste',
    pseudonymId: 'pseudo-student-1',
    role: Role.STUDENT,
    active: false,
    avatar: avatarCatalog[0],
  } as unknown as User;

  const activeStudentEnrollment = {
    id: 'enrollment-1',
    studentId: 'student-1',
    classroomId: 'classroom-1',
    active: true,
  } as Enrollment;

  beforeEach(() => {
    usersService = {
      createPendingStudent: jest.fn().mockResolvedValue(pendingStudent),
      activateStudentCredential: jest
        .fn()
        .mockResolvedValue({ ...pendingStudent, active: true }),
      findById: jest.fn().mockResolvedValue(pendingStudent),
    } as unknown as jest.Mocked<UsersService>;
    schoolsService = {
      findClassroomById: jest.fn().mockResolvedValue(ownClassroom),
      hasActiveStudentWithNameInClassroom: jest.fn().mockResolvedValue(false),
      createEnrollment: jest.fn().mockResolvedValue(undefined),
      findSingleActiveEnrollment: jest
        .fn()
        .mockResolvedValue(activeStudentEnrollment),
    } as unknown as jest.Mocked<SchoolsService>;
    illustrationsService = {
      findByKind: jest.fn().mockResolvedValue(avatarCatalog),
      pickRandomAvatar: jest.fn().mockResolvedValue(avatarCatalog[0]),
      pickRandomLoginImageSequence: jest.fn().mockResolvedValue(loginImages),
    } as unknown as jest.Mocked<IllustrationsService>;
    eventsService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventsService>;
    guardianConsentsService = {
      findByStudentId: jest.fn().mockResolvedValue(null),
      hasConsent: jest.fn().mockResolvedValue(true),
      recordConsent: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<GuardianConsentsService>;

    service = new StudentAccountsService(
      usersService,
      schoolsService,
      illustrationsService,
      eventsService,
      guardianConsentsService,
    );
  });

  describe('createPending (A2, passo 1)', () => {
    it('throws NotFoundException when the classroom does not exist', async () => {
      schoolsService.findClassroomById.mockResolvedValue(null);

      await expect(
        service.createPending(
          { displayName: 'Aluno', classroomId: 'classroom-x' },
          { id: 'teacher-1', role: Role.TEACHER },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(usersService.createPendingStudent).not.toHaveBeenCalled();
    });

    it('AC — a teacher can only enroll students into their own classroom', async () => {
      schoolsService.findClassroomById.mockResolvedValue(
        otherTeacherClassroom,
      );

      await expect(
        service.createPending(
          { displayName: 'Aluno', classroomId: 'classroom-2' },
          { id: 'teacher-1', role: Role.TEACHER },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(usersService.createPendingStudent).not.toHaveBeenCalled();
    });

    it('an admin can enroll into any classroom, not just their own', async () => {
      schoolsService.findClassroomById.mockResolvedValue(
        otherTeacherClassroom,
      );

      await expect(
        service.createPending(
          { displayName: 'Aluno', classroomId: 'classroom-2' },
          { id: 'admin-1', role: Role.ADMIN },
        ),
      ).resolves.toBeDefined();
    });

    it('picks a random avatar when none is provided, never derives it from the name', async () => {
      const result = await service.createPending(
        { displayName: 'Aluno Teste', classroomId: 'classroom-1' },
        { id: 'teacher-1', role: Role.TEACHER },
      );

      expect(illustrationsService.pickRandomAvatar).toHaveBeenCalled();
      expect(result.avatar).toEqual({ label: 'Gato', assetRef: 'gato.svg' });
    });

    it('rejects an avatarId that is not in the avatar catalog', async () => {
      await expect(
        service.createPending(
          {
            displayName: 'Aluno',
            classroomId: 'classroom-1',
            avatarId: 'not-an-avatar',
          },
          { id: 'teacher-1', role: Role.TEACHER },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates the student WITHOUT a login credential yet — no pickRandomLoginImageSequence call', async () => {
      await service.createPending(
        { displayName: 'Aluno Teste', classroomId: 'classroom-1' },
        { id: 'teacher-1', role: Role.TEACHER },
      );

      expect(usersService.createPendingStudent).toHaveBeenCalledWith({
        displayName: 'Aluno Teste',
        avatarId: 'avatar-1',
      });
      expect(illustrationsService.pickRandomLoginImageSequence).not.toHaveBeenCalled();
    });

    it('creates the enrollment and emits student_account_created (RD-I) scoped to the new student', async () => {
      await service.createPending(
        { displayName: 'Aluno Teste', classroomId: 'classroom-1' },
        { id: 'teacher-1', role: Role.TEACHER },
      );

      expect(schoolsService.createEnrollment).toHaveBeenCalledWith(
        'student-1',
        'classroom-1',
      );
      expect(eventsService.record).toHaveBeenCalledWith({
        studentPseudoId: 'pseudo-student-1',
        category: EventCategory.INTERACTION,
        type: 'student_account_created',
        payload: { created_by_role: Role.TEACHER, class_id: 'classroom-1' },
      });
    });

    it('AC — a duplicate name in the same classroom is a non-blocking warning, not a fatal error', async () => {
      schoolsService.hasActiveStudentWithNameInClassroom.mockResolvedValue(
        true,
      );

      const result = await service.createPending(
        { displayName: 'Aluno Teste', classroomId: 'classroom-1' },
        { id: 'teacher-1', role: Role.TEACHER },
      );

      expect(result.duplicateWarning).toBe(true);
      expect(usersService.createPendingStudent).toHaveBeenCalled();
    });
  });

  describe('registerGuardianConsent (A2, passo 2)', () => {
    it('throws NotFoundException when the student does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.registerGuardianConsent(
          'missing',
          {
            guardianName: 'Maria',
            guardianRelationship: 'Mãe',
            guardianContact: '11999990000',
            consentAccepted: true,
          },
          { id: 'teacher-1', role: Role.TEACHER },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(guardianConsentsService.recordConsent).not.toHaveBeenCalled();
    });

    it('AC2 — rejects when consentAccepted is not explicitly true, before recording anything', async () => {
      await expect(
        service.registerGuardianConsent(
          'student-1',
          {
            guardianName: 'Maria',
            guardianRelationship: 'Mãe',
            guardianContact: '11999990000',
            consentAccepted: false,
          },
          { id: 'teacher-1', role: Role.TEACHER },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(guardianConsentsService.recordConsent).not.toHaveBeenCalled();
      expect(usersService.activateStudentCredential).not.toHaveBeenCalled();
    });

    it('rejects re-registering consent for a student that already has one', async () => {
      guardianConsentsService.findByStudentId.mockResolvedValue(
        {} as GuardianConsent,
      );

      await expect(
        service.registerGuardianConsent(
          'student-1',
          {
            guardianName: 'Maria',
            guardianRelationship: 'Mãe',
            guardianContact: '11999990000',
            consentAccepted: true,
          },
          { id: 'teacher-1', role: Role.TEACHER },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(guardianConsentsService.recordConsent).not.toHaveBeenCalled();
    });

    it('AC2 — records the consent (with timestamp + who) BEFORE activating the credential', async () => {
      const callOrder: string[] = [];
      guardianConsentsService.recordConsent.mockImplementation(async () => {
        callOrder.push('recordConsent');
        return {} as GuardianConsent;
      });
      usersService.activateStudentCredential.mockImplementation(async () => {
        callOrder.push('activateStudentCredential');
        return { ...pendingStudent, active: true };
      });

      await service.registerGuardianConsent(
        'student-1',
        {
          guardianName: '  Maria Silva  ',
          guardianRelationship: ' Mãe ',
          guardianContact: ' 11999990000 ',
          consentAccepted: true,
        },
        { id: 'teacher-1', role: Role.TEACHER },
      );

      expect(callOrder).toEqual(['recordConsent', 'activateStudentCredential']);
      expect(guardianConsentsService.recordConsent).toHaveBeenCalledWith({
        studentId: 'student-1',
        guardianName: 'Maria Silva',
        guardianRelationship: 'Mãe',
        guardianContact: '11999990000',
        consentedAt: expect.any(Date),
        collectedByUserId: 'teacher-1',
      });
    });
  });

  describe('activateCredential (A2, passo 3 / AC3)', () => {
    it('throws NotFoundException when the student does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.activateCredential('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('AC3 — blocks with a clear message when guardian consent is pending, never generating a credential', async () => {
      guardianConsentsService.hasConsent.mockResolvedValue(false);

      await expect(service.activateCredential('student-1')).rejects.toThrow(
        /consentimento do responsável legal pendente/i,
      );
      expect(
        illustrationsService.pickRandomLoginImageSequence,
      ).not.toHaveBeenCalled();
      expect(usersService.activateStudentCredential).not.toHaveBeenCalled();
    });

    it('rejects re-activating a student whose credential is already active (never silently regenerates it)', async () => {
      usersService.findById.mockResolvedValue({
        ...pendingStudent,
        active: true,
      });

      await expect(service.activateCredential('student-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(usersService.activateStudentCredential).not.toHaveBeenCalled();
    });

    it('generates the login credential and activates the student once consent is confirmed', async () => {
      const result = await service.activateCredential('student-1');

      expect(usersService.activateStudentCredential).toHaveBeenCalledWith(
        'student-1',
        ['img-1', 'img-2', 'img-3'],
      );
      expect(result.credential.avatar).toEqual({
        label: 'Gato',
        assetRef: 'gato.svg',
      });
      expect(result.credential.loginImages).toHaveLength(3);
    });

    it('never uses the free-text name as part of the login credential', async () => {
      const result = await service.activateCredential('student-1');

      const credentialJson = JSON.stringify(result.credential);
      expect(credentialJson).not.toMatch(/Aluno Teste/);
    });
  });
});
