import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { Classroom } from './entities/classroom.entity';
import { School } from './entities/school.entity';
import { SchoolsAdminService } from './schools-admin.service';
import { SchoolsService } from './schools.service';

describe('SchoolsAdminService', () => {
  let service: SchoolsAdminService;
  let schoolsService: jest.Mocked<SchoolsService>;
  let usersService: jest.Mocked<UsersService>;

  const teacher = {
    id: 'teacher-1',
    role: Role.TEACHER,
    displayName: 'Prof. Ana',
  } as User;

  beforeEach(() => {
    schoolsService = {
      createSchool: jest.fn(),
      updateSchool: jest.fn(),
      setSchoolActive: jest.fn(),
      findAllSchoolsIncludingInactive: jest.fn(),
      findSchoolById: jest.fn(),
      findSchoolByIdIncludingInactive: jest.fn(),
      createClassroom: jest.fn(),
      updateClassroom: jest.fn(),
      setClassroomActive: jest.fn(),
      findClassroomsBySchoolIncludingInactive: jest.fn(),
    } as unknown as jest.Mocked<SchoolsService>;
    usersService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new SchoolsAdminService(schoolsService, usersService);
  });

  describe('createSchool', () => {
    it('trims name and normalizes a missing externalId to null', async () => {
      schoolsService.createSchool.mockResolvedValue({
        id: 's1',
        name: 'Escola Nova',
        externalId: null,
        deletedAt: null,
        createdAt: new Date(),
      } as School);

      const result = await service.createSchool({ name: '  Escola Nova  ' });

      expect(schoolsService.createSchool).toHaveBeenCalledWith({
        name: 'Escola Nova',
        externalId: null,
      });
      expect(result.active).toBe(true);
    });

    it('treats an empty-string externalId as "no value" (never persists whitespace)', async () => {
      schoolsService.createSchool.mockResolvedValue({} as School);

      await service.createSchool({ name: 'Escola', externalId: '   ' });

      expect(schoolsService.createSchool).toHaveBeenCalledWith({
        name: 'Escola',
        externalId: null,
      });
    });
  });

  describe('updateSchool', () => {
    it('throws NotFoundException when the school does not exist', async () => {
      schoolsService.updateSchool.mockResolvedValue(null);

      await expect(
        service.updateSchool('missing', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('leaves externalId untouched when not provided in the DTO', async () => {
      schoolsService.updateSchool.mockResolvedValue({
        id: 's1',
        name: 'Novo nome',
        externalId: 'INEP1',
        deletedAt: null,
        createdAt: new Date(),
      } as School);

      await service.updateSchool('s1', { name: 'Novo nome' });

      expect(schoolsService.updateSchool).toHaveBeenCalledWith('s1', {
        name: 'Novo nome',
        externalId: undefined,
      });
    });
  });

  describe('setSchoolActive', () => {
    it('throws NotFoundException when the school does not exist', async () => {
      schoolsService.setSchoolActive.mockResolvedValue(null);

      await expect(
        service.setSchoolActive('missing', false, 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('maps deletedAt=null to active:true', async () => {
      schoolsService.setSchoolActive.mockResolvedValue({
        id: 's1',
        name: 'Escola',
        externalId: null,
        deletedAt: null,
        createdAt: new Date(),
      } as School);

      const result = await service.setSchoolActive('s1', true, 'admin-1');

      expect(result.active).toBe(true);
    });

    it('maps a stamped deletedAt to active:false', async () => {
      schoolsService.setSchoolActive.mockResolvedValue({
        id: 's1',
        name: 'Escola',
        externalId: null,
        deletedAt: new Date(),
        createdAt: new Date(),
      } as School);

      const result = await service.setSchoolActive('s1', false, 'admin-1');

      expect(result.active).toBe(false);
    });
  });

  describe('getSchool', () => {
    it('throws NotFoundException when the school does not exist', async () => {
      schoolsService.findSchoolByIdIncludingInactive.mockResolvedValue(null);

      await expect(service.getSchool('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('resolves a deactivated school too (withDeleted, via findSchoolByIdIncludingInactive)', async () => {
      schoolsService.findSchoolByIdIncludingInactive.mockResolvedValue({
        id: 's1',
        name: 'Escola',
        externalId: null,
        deletedAt: new Date(),
        createdAt: new Date(),
      } as School);

      const result = await service.getSchool('s1');

      expect(result.active).toBe(false);
    });
  });

  describe('listClassrooms', () => {
    it('throws NotFoundException when the school does not exist (even deactivated)', async () => {
      schoolsService.findSchoolByIdIncludingInactive.mockResolvedValue(null);

      await expect(service.listClassrooms('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createClassroom', () => {
    it('rejects when the school does not exist or is deactivated', async () => {
      schoolsService.findSchoolById.mockResolvedValue(null);

      await expect(
        service.createClassroom('school-1', { name: 'Turma A' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(schoolsService.createClassroom).not.toHaveBeenCalled();
    });

    it('rejects a teacherId that does not belong to a teacher account', async () => {
      schoolsService.findSchoolById.mockResolvedValue({
        id: 'school-1',
        name: 'Escola',
      } as School);
      usersService.findById.mockResolvedValue({
        id: 'x',
        role: Role.ADMIN,
      } as User);

      await expect(
        service.createClassroom('school-1', {
          name: 'Turma A',
          teacherId: 'x',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(schoolsService.createClassroom).not.toHaveBeenCalled();
    });

    it('creates the classroom scoped to the school, resolving the teacher name from the validated teacher', async () => {
      schoolsService.findSchoolById.mockResolvedValue({
        id: 'school-1',
        name: 'Escola',
      } as School);
      usersService.findById.mockResolvedValue(teacher);
      schoolsService.createClassroom.mockResolvedValue({
        id: 'c1',
        schoolId: 'school-1',
        name: 'Turma A',
        joinCode: 'AZUL-1',
        teacherId: 'teacher-1',
        teacher: null,
        deletedAt: null,
        createdAt: new Date(),
      } as unknown as Classroom);

      const result = await service.createClassroom('school-1', {
        name: '  Turma A  ',
        teacherId: 'teacher-1',
      });

      expect(schoolsService.createClassroom).toHaveBeenCalledWith({
        schoolId: 'school-1',
        name: 'Turma A',
        teacherId: 'teacher-1',
      });
      expect(result.teacherName).toBe('Prof. Ana');
      expect(result.active).toBe(true);
    });
  });

  describe('updateClassroom', () => {
    it('throws NotFoundException when the classroom does not exist', async () => {
      schoolsService.updateClassroom.mockResolvedValue(null);

      await expect(
        service.updateClassroom('missing', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('an explicit null teacherId unassigns the teacher without a lookup', async () => {
      schoolsService.updateClassroom.mockResolvedValue({
        id: 'c1',
        schoolId: 'school-1',
        name: 'Turma A',
        joinCode: 'AZUL-1',
        teacherId: null,
        teacher: null,
        deletedAt: null,
        createdAt: new Date(),
      } as unknown as Classroom);

      const result = await service.updateClassroom('c1', { teacherId: null });

      expect(usersService.findById).not.toHaveBeenCalled();
      expect(schoolsService.updateClassroom).toHaveBeenCalledWith('c1', {
        name: undefined,
        teacherId: null,
      });
      expect(result.teacherName).toBeNull();
    });
  });

  describe('setClassroomActive', () => {
    it('throws NotFoundException when the classroom does not exist', async () => {
      schoolsService.setClassroomActive.mockResolvedValue(null);

      await expect(
        service.setClassroomActive('missing', false, 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
