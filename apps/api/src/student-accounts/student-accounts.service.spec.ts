import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventCategory } from '../common/enums/event-category.enum';
import { IllustrationKind } from '../common/enums/illustration-kind.enum';
import { Role } from '../common/enums/role.enum';
import { Illustration } from '../illustrations/entities/illustration.entity';
import { IllustrationsService } from '../illustrations/illustrations.service';
import { Classroom } from '../schools/entities/classroom.entity';
import { SchoolsService } from '../schools/schools.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { StudentAccountsService } from './student-accounts.service';

describe('StudentAccountsService', () => {
  let service: StudentAccountsService;
  let usersService: jest.Mocked<UsersService>;
  let schoolsService: jest.Mocked<SchoolsService>;
  let illustrationsService: jest.Mocked<IllustrationsService>;
  let eventsService: jest.Mocked<EventsService>;

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

  const createdStudent = {
    id: 'student-1',
    displayName: 'Aluno Teste',
    pseudonymId: 'pseudo-student-1',
  } as User;

  beforeEach(() => {
    usersService = {
      createStudent: jest.fn().mockResolvedValue(createdStudent),
    } as unknown as jest.Mocked<UsersService>;
    schoolsService = {
      findClassroomById: jest.fn(),
      hasActiveStudentWithNameInClassroom: jest.fn().mockResolvedValue(false),
      createEnrollment: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SchoolsService>;
    illustrationsService = {
      findByKind: jest.fn().mockResolvedValue(avatarCatalog),
      pickRandomAvatar: jest.fn().mockResolvedValue(avatarCatalog[0]),
      pickRandomLoginImageSequence: jest.fn().mockResolvedValue(loginImages),
    } as unknown as jest.Mocked<IllustrationsService>;
    eventsService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventsService>;

    service = new StudentAccountsService(
      usersService,
      schoolsService,
      illustrationsService,
      eventsService,
    );
  });

  it('throws NotFoundException when the classroom does not exist', async () => {
    schoolsService.findClassroomById.mockResolvedValue(null);

    await expect(
      service.create(
        { displayName: 'Aluno', classroomId: 'classroom-x' },
        { id: 'teacher-1', role: Role.TEACHER },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(usersService.createStudent).not.toHaveBeenCalled();
  });

  it('AC — a teacher can only enroll students into their own classroom', async () => {
    schoolsService.findClassroomById.mockResolvedValue(otherTeacherClassroom);

    await expect(
      service.create(
        { displayName: 'Aluno', classroomId: 'classroom-2' },
        { id: 'teacher-1', role: Role.TEACHER },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(usersService.createStudent).not.toHaveBeenCalled();
  });

  it('an admin can enroll into any classroom, not just their own', async () => {
    schoolsService.findClassroomById.mockResolvedValue(otherTeacherClassroom);

    await expect(
      service.create(
        { displayName: 'Aluno', classroomId: 'classroom-2' },
        { id: 'admin-1', role: Role.ADMIN },
      ),
    ).resolves.toBeDefined();
  });

  it('picks a random avatar when none is provided, never derives it from the name', async () => {
    schoolsService.findClassroomById.mockResolvedValue(ownClassroom);

    const result = await service.create(
      { displayName: 'Aluno Teste', classroomId: 'classroom-1' },
      { id: 'teacher-1', role: Role.TEACHER },
    );

    expect(illustrationsService.pickRandomAvatar).toHaveBeenCalled();
    expect(result.credential.avatar).toEqual({
      label: 'Gato',
      assetRef: 'gato.svg',
    });
  });

  it('rejects an avatarId that is not in the avatar catalog', async () => {
    schoolsService.findClassroomById.mockResolvedValue(ownClassroom);

    await expect(
      service.create(
        {
          displayName: 'Aluno',
          classroomId: 'classroom-1',
          avatarId: 'not-an-avatar',
        },
        { id: 'teacher-1', role: Role.TEACHER },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the chosen avatarId when it is valid', async () => {
    schoolsService.findClassroomById.mockResolvedValue(ownClassroom);

    const result = await service.create(
      {
        displayName: 'Aluno',
        classroomId: 'classroom-1',
        avatarId: 'avatar-2',
      },
      { id: 'teacher-1', role: Role.TEACHER },
    );

    expect(illustrationsService.pickRandomAvatar).not.toHaveBeenCalled();
    expect(result.credential.avatar).toEqual({
      label: 'Cachorro',
      assetRef: 'cachorro.svg',
    });
  });

  it('never uses the free-text name as part of the login credential', async () => {
    schoolsService.findClassroomById.mockResolvedValue(ownClassroom);

    const result = await service.create(
      { displayName: 'Aluno Teste', classroomId: 'classroom-1' },
      { id: 'teacher-1', role: Role.TEACHER },
    );

    const credentialJson = JSON.stringify(result.credential);
    expect(credentialJson).not.toMatch(/Aluno Teste/);
    expect(usersService.createStudent).toHaveBeenCalledWith(
      expect.objectContaining({
        loginImageSequence: ['img-1', 'img-2', 'img-3'],
      }),
    );
  });

  it('creates the enrollment and emits student_account_created (RD-I) scoped to the new student', async () => {
    schoolsService.findClassroomById.mockResolvedValue(ownClassroom);

    await service.create(
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
    schoolsService.findClassroomById.mockResolvedValue(ownClassroom);
    schoolsService.hasActiveStudentWithNameInClassroom.mockResolvedValue(true);

    const result = await service.create(
      { displayName: 'Aluno Teste', classroomId: 'classroom-1' },
      { id: 'teacher-1', role: Role.TEACHER },
    );

    expect(result.duplicateWarning).toBe(true);
    expect(usersService.createStudent).toHaveBeenCalled();
  });
});
