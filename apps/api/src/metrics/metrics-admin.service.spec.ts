import { EventsService } from '../events/events.service';
import { SchoolsService } from '../schools/schools.service';
import { MetricsAdminService } from './metrics-admin.service';

describe('MetricsAdminService', () => {
  let service: MetricsAdminService;
  let schoolsService: jest.Mocked<SchoolsService>;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(() => {
    schoolsService = {
      findAllSchools: jest.fn(),
      findClassroomsBySchool: jest.fn(),
      countDistinctTeachersBySchool: jest.fn(),
      findActiveStudentsBySchool: jest.fn(),
      countActiveStudentsInClassroom: jest.fn(),
    } as unknown as jest.Mocked<SchoolsService>;
    eventsService = {
      countDistinctStudentsActiveSince: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;

    service = new MetricsAdminService(schoolsService, eventsService);
  });

  describe('listSchoolsOverview', () => {
    it('returns an empty list when there are no schools, never an error', async () => {
      schoolsService.findAllSchools.mockResolvedValue([]);

      const result = await service.listSchoolsOverview();

      expect(result).toEqual([]);
    });

    it('aggregates classroomsCount/teachersCount/activeStudentsCount/activeStudentsToday per school', async () => {
      schoolsService.findAllSchools.mockResolvedValue([{ id: 'school-1', name: 'Escola Azul' } as any]);
      schoolsService.findClassroomsBySchool.mockResolvedValue([{ id: 'c1' } as any, { id: 'c2' } as any]);
      schoolsService.countDistinctTeachersBySchool.mockResolvedValue(2);
      schoolsService.findActiveStudentsBySchool.mockResolvedValue([
        { student: { pseudonymId: 'p1' } } as any,
        { student: { pseudonymId: 'p2' } } as any,
      ]);
      eventsService.countDistinctStudentsActiveSince.mockResolvedValue(1);

      const result = await service.listSchoolsOverview();

      expect(result).toEqual([
        {
          id: 'school-1',
          name: 'Escola Azul',
          classroomsCount: 2,
          teachersCount: 2,
          activeStudentsCount: 2,
          activeStudentsToday: 1,
        },
      ]);
    });

    it('returns 0 classrooms/teachers/students for a school with nothing cadastrado, never an error', async () => {
      schoolsService.findAllSchools.mockResolvedValue([{ id: 'school-1', name: 'Escola Nova' } as any]);
      schoolsService.findClassroomsBySchool.mockResolvedValue([]);
      schoolsService.countDistinctTeachersBySchool.mockResolvedValue(0);
      schoolsService.findActiveStudentsBySchool.mockResolvedValue([]);
      eventsService.countDistinctStudentsActiveSince.mockResolvedValue(0);

      const result = await service.listSchoolsOverview();

      expect(result).toEqual([
        {
          id: 'school-1',
          name: 'Escola Nova',
          classroomsCount: 0,
          teachersCount: 0,
          activeStudentsCount: 0,
          activeStudentsToday: 0,
        },
      ]);
    });

    it('passes the pseudonym ids of active students, not user ids, to countDistinctStudentsActiveSince', async () => {
      schoolsService.findAllSchools.mockResolvedValue([{ id: 'school-1', name: 'Escola Azul' } as any]);
      schoolsService.findClassroomsBySchool.mockResolvedValue([]);
      schoolsService.countDistinctTeachersBySchool.mockResolvedValue(0);
      schoolsService.findActiveStudentsBySchool.mockResolvedValue([
        { student: { pseudonymId: 'pseudo-1' } } as any,
      ]);
      eventsService.countDistinctStudentsActiveSince.mockResolvedValue(1);

      await service.listSchoolsOverview();

      expect(eventsService.countDistinctStudentsActiveSince).toHaveBeenCalledWith(
        ['pseudo-1'],
        expect.any(Date),
      );
    });
  });

  describe('getSchoolClassrooms', () => {
    it('returns an empty list for a school with no classrooms yet, never an error', async () => {
      schoolsService.findClassroomsBySchool.mockResolvedValue([]);

      const result = await service.getSchoolClassrooms('school-1');

      expect(result).toEqual([]);
    });

    it('resolves the responsible teacher display name per classroom', async () => {
      schoolsService.findClassroomsBySchool.mockResolvedValue([
        { id: 'c1', name: 'Turma A', teacher: { displayName: 'Profa. Ana' } } as any,
      ]);
      schoolsService.countActiveStudentsInClassroom.mockResolvedValue(12);

      const result = await service.getSchoolClassrooms('school-1');

      expect(result).toEqual([
        { id: 'c1', name: 'Turma A', teacherDisplayName: 'Profa. Ana', activeStudentsCount: 12 },
      ]);
    });

    it('never throws when a classroom has no professor titular yet — teacherDisplayName is null', async () => {
      schoolsService.findClassroomsBySchool.mockResolvedValue([
        { id: 'c1', name: 'Turma sem professor', teacher: null } as any,
      ]);
      schoolsService.countActiveStudentsInClassroom.mockResolvedValue(0);

      const result = await service.getSchoolClassrooms('school-1');

      expect(result[0].teacherDisplayName).toBeNull();
    });
  });
});
