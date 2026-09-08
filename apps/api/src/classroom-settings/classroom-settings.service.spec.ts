import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Role } from '../common/enums/role.enum';
import { SchoolsService } from '../schools/schools.service';
import { ClassroomSettingsService } from './classroom-settings.service';

describe('ClassroomSettingsService', () => {
  let service: ClassroomSettingsService;
  let schoolsService: jest.Mocked<SchoolsService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    schoolsService = {
      findClassroomById: jest.fn(),
      setClassroomComparisonEnabled: jest.fn(),
    } as unknown as jest.Mocked<SchoolsService>;
    auditService = {
      recordClassComparisonSettingChange: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    service = new ClassroomSettingsService(schoolsService, auditService);
  });

  it('turns comparison on for the classroom owner teacher and audits who changed it', async () => {
    schoolsService.findClassroomById.mockResolvedValue({
      id: 'classroom-1',
      teacherId: 'teacher-1',
    } as any);
    schoolsService.setClassroomComparisonEnabled.mockResolvedValue({
      id: 'classroom-1',
      comparisonEnabled: true,
    } as any);

    const result = await service.setComparisonEnabled('classroom-1', true, {
      id: 'teacher-1',
      role: Role.TEACHER,
    });

    expect(result).toEqual({ classroomId: 'classroom-1', enabled: true });
    expect(schoolsService.setClassroomComparisonEnabled).toHaveBeenCalledWith(
      'classroom-1',
      true,
    );
    expect(auditService.recordClassComparisonSettingChange).toHaveBeenCalledWith({
      classroomId: 'classroom-1',
      enabled: true,
      changedByUserId: 'teacher-1',
      changedByRole: Role.TEACHER,
    });
  });

  it('never lets a teacher toggle a classroom that is not their own', async () => {
    schoolsService.findClassroomById.mockResolvedValue({
      id: 'classroom-1',
      teacherId: 'other-teacher',
    } as any);

    await expect(
      service.setComparisonEnabled('classroom-1', true, {
        id: 'teacher-1',
        role: Role.TEACHER,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(schoolsService.setClassroomComparisonEnabled).not.toHaveBeenCalled();
  });

  it('allows an admin to toggle any classroom regardless of teacherId', async () => {
    schoolsService.findClassroomById.mockResolvedValue({
      id: 'classroom-1',
      teacherId: 'some-teacher',
    } as any);
    schoolsService.setClassroomComparisonEnabled.mockResolvedValue({
      id: 'classroom-1',
      comparisonEnabled: false,
    } as any);

    const result = await service.setComparisonEnabled('classroom-1', false, {
      id: 'admin-1',
      role: Role.ADMIN,
    });

    expect(result).toEqual({ classroomId: 'classroom-1', enabled: false });
  });

  it('throws NotFoundException for a classroom that does not exist', async () => {
    schoolsService.findClassroomById.mockResolvedValue(null);

    await expect(
      service.setComparisonEnabled('missing', true, { id: 'teacher-1', role: Role.TEACHER }),
    ).rejects.toThrow(NotFoundException);
  });
});
