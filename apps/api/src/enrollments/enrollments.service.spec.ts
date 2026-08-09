import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventCategory } from '../common/enums/event-category.enum';
import { Role } from '../common/enums/role.enum';
import { EventsService } from '../events/events.service';
import { Classroom } from '../schools/entities/classroom.entity';
import { Enrollment } from '../schools/entities/enrollment.entity';
import { SchoolsService } from '../schools/schools.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { EnrollmentsService } from './enrollments.service';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let schoolsService: jest.Mocked<SchoolsService>;
  let usersService: jest.Mocked<UsersService>;
  let eventsService: jest.Mocked<EventsService>;

  const student = {
    id: 'student-1',
    role: Role.STUDENT,
    pseudonymId: 'pseudo-1',
  } as User;
  const teacherActor = { id: 'teacher-1', role: Role.TEACHER };
  const adminActor = { id: 'admin-1', role: Role.ADMIN };
  const ownClassroom = {
    id: 'classroom-1',
    name: 'Turma A',
    joinCode: 'AZUL-1',
    teacherId: 'teacher-1',
  } as Classroom;
  const otherClassroom = {
    id: 'classroom-2',
    name: 'Turma B',
    joinCode: 'AZUL-2',
    teacherId: 'teacher-2',
  } as Classroom;

  beforeEach(() => {
    schoolsService = {
      findClassroomById: jest.fn(),
      findSingleActiveEnrollment: jest.fn(),
      endEnrollment: jest.fn().mockResolvedValue(undefined),
      createEnrollment: jest.fn().mockResolvedValue(undefined),
      findActiveStudentsInClassroom: jest.fn(),
    } as unknown as jest.Mocked<SchoolsService>;
    usersService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    eventsService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventsService>;

    service = new EnrollmentsService(
      schoolsService,
      usersService,
      eventsService,
    );
  });

  describe('transfer', () => {
    it('throws NotFoundException when the target is not a student', async () => {
      usersService.findById.mockResolvedValue({
        ...student,
        role: Role.TEACHER,
      } as User);

      await expect(
        service.transfer('student-1', 'classroom-1', teacherActor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the destination classroom does not exist', async () => {
      usersService.findById.mockResolvedValue(student);
      schoolsService.findClassroomById.mockResolvedValue(null);

      await expect(
        service.transfer('student-1', 'classroom-x', teacherActor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a teacher enrolling into a classroom they do not own', async () => {
      usersService.findById.mockResolvedValue(student);
      schoolsService.findClassroomById.mockResolvedValue(otherClassroom);

      await expect(
        service.transfer('student-1', 'classroom-2', teacherActor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(schoolsService.createEnrollment).not.toHaveBeenCalled();
    });

    it('AC1 — registers the first enrollment with no previous classroom to end', async () => {
      usersService.findById.mockResolvedValue(student);
      schoolsService.findClassroomById.mockResolvedValue(ownClassroom);
      schoolsService.findSingleActiveEnrollment.mockResolvedValue(null);

      const result = await service.transfer(
        'student-1',
        'classroom-1',
        teacherActor,
      );

      expect(schoolsService.endEnrollment).not.toHaveBeenCalled();
      expect(schoolsService.createEnrollment).toHaveBeenCalledWith(
        'student-1',
        'classroom-1',
      );
      expect(result.previousClassroomId).toBeNull();
      expect(eventsService.record).toHaveBeenCalledWith({
        studentPseudoId: 'pseudo-1',
        category: EventCategory.LONGITUDINAL,
        type: 'class_enrollment_changed',
        payload: { previous_class_id: null, new_class_id: 'classroom-1' },
      });
    });

    it('AC2 — ends the previous enrollment and creates a new one on transfer, pseudonym unchanged', async () => {
      usersService.findById.mockResolvedValue(student);
      schoolsService.findClassroomById.mockImplementation(async (id) =>
        id === 'classroom-1'
          ? ownClassroom
          : ({
              id: 'classroom-3',
              name: 'Turma C',
              joinCode: 'AZUL-3',
              teacherId: 'teacher-1',
            } as Classroom),
      );
      const previousEnrollment = {
        id: 'e1',
        classroomId: 'classroom-3',
      } as Enrollment;
      schoolsService.findSingleActiveEnrollment.mockResolvedValue(
        previousEnrollment,
      );

      const result = await service.transfer(
        'student-1',
        'classroom-1',
        teacherActor,
      );

      expect(schoolsService.endEnrollment).toHaveBeenCalledWith(
        previousEnrollment,
      );
      expect(schoolsService.createEnrollment).toHaveBeenCalledWith(
        'student-1',
        'classroom-1',
      );
      expect(result.previousClassroomId).toBe('classroom-3');
      expect(eventsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            previous_class_id: 'classroom-3',
            new_class_id: 'classroom-1',
          },
        }),
      );
    });

    it('AC5 — rejects transferring into the classroom the student is already active in', async () => {
      usersService.findById.mockResolvedValue(student);
      schoolsService.findClassroomById.mockResolvedValue(ownClassroom);
      schoolsService.findSingleActiveEnrollment.mockResolvedValue({
        id: 'e1',
        classroomId: 'classroom-1',
      } as Enrollment);

      await expect(
        service.transfer('student-1', 'classroom-1', teacherActor),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(schoolsService.createEnrollment).not.toHaveBeenCalled();
    });

    it('rejects a teacher transferring a student out of a classroom owned by another teacher', async () => {
      usersService.findById.mockResolvedValue(student);
      schoolsService.findClassroomById.mockImplementation(async (id) =>
        id === 'classroom-1' ? ownClassroom : otherClassroom,
      );
      schoolsService.findSingleActiveEnrollment.mockResolvedValue({
        id: 'e1',
        classroomId: 'classroom-2',
      } as Enrollment);

      await expect(
        service.transfer('student-1', 'classroom-1', teacherActor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(schoolsService.endEnrollment).not.toHaveBeenCalled();
    });

    it('an admin can transfer a student across classrooms owned by different teachers', async () => {
      usersService.findById.mockResolvedValue(student);
      schoolsService.findClassroomById.mockImplementation(async (id) =>
        id === 'classroom-1' ? ownClassroom : otherClassroom,
      );
      schoolsService.findSingleActiveEnrollment.mockResolvedValue({
        id: 'e1',
        classroomId: 'classroom-2',
      } as Enrollment);

      await expect(
        service.transfer('student-1', 'classroom-1', adminActor),
      ).resolves.toBeDefined();
    });
  });

  describe('listRoster', () => {
    it('throws NotFoundException when the classroom does not exist', async () => {
      schoolsService.findClassroomById.mockResolvedValue(null);

      await expect(
        service.listRoster('classroom-x', teacherActor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a teacher listing a roster for a classroom they do not own', async () => {
      schoolsService.findClassroomById.mockResolvedValue(otherClassroom);

      await expect(
        service.listRoster('classroom-2', teacherActor),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('maps enrollments to id/displayName/avatar/enrolledAt only, never pseudonym/email', async () => {
      schoolsService.findClassroomById.mockResolvedValue(ownClassroom);
      const enrolledAt = new Date('2026-02-01T00:00:00Z');
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        {
          student: {
            id: 'student-1',
            displayName: 'Aluno Um',
            avatar: { label: 'Gato', assetRef: 'gato.svg' },
          },
          enrolledAt,
        } as unknown as Enrollment,
      ]);

      const result = await service.listRoster('classroom-1', teacherActor);

      expect(result).toEqual([
        {
          id: 'student-1',
          displayName: 'Aluno Um',
          avatar: { label: 'Gato', assetRef: 'gato.svg' },
          enrolledAt,
        },
      ]);
    });
  });
});
