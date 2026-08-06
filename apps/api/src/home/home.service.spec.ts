import { ChallengesService } from '../challenges/challenges.service';
import { EventCategory } from '../common/enums/event-category.enum';
import { EventsService } from '../events/events.service';
import { SchoolsService } from '../schools/schools.service';
import { UsersService } from '../users/users.service';
import { HomeService } from './home.service';

describe('HomeService', () => {
  let service: HomeService;
  let challengesService: jest.Mocked<ChallengesService>;
  let eventsService: jest.Mocked<EventsService>;
  let schoolsService: jest.Mocked<SchoolsService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(() => {
    challengesService = { findFirst: jest.fn() } as unknown as jest.Mocked<ChallengesService>;
    eventsService = {
      countByStudentCategoryType: jest.fn(),
      countDistinctStudentsActiveSince: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;
    schoolsService = {
      findClassroomsByTeacher: jest.fn(),
      findActiveStudentsInClassroom: jest.fn(),
      countSchools: jest.fn(),
      countClassrooms: jest.fn(),
    } as unknown as jest.Mocked<SchoolsService>;
    usersService = { countAll: jest.fn() } as unknown as jest.Mocked<UsersService>;

    service = new HomeService(challengesService, eventsService, schoolsService, usersService);
  });

  describe('getStudentHome', () => {
    it('returns null continueChallenge when no challenge exists yet', async () => {
      challengesService.findFirst.mockResolvedValue(null);
      eventsService.countByStudentCategoryType.mockResolvedValue(0);

      const result = await service.getStudentHome('pseudo-1');

      expect(result).toEqual({
        continueChallenge: null,
        progress: { completedChallengesCount: 0 },
      });
    });

    it('scopes completed-challenge progress to the requesting student only', async () => {
      challengesService.findFirst.mockResolvedValue({ id: 'c1', title: 'Desafio 1' } as any);
      eventsService.countByStudentCategoryType.mockResolvedValue(4);

      const result = await service.getStudentHome('pseudo-1');

      expect(eventsService.countByStudentCategoryType).toHaveBeenCalledWith(
        'pseudo-1',
        EventCategory.CURRICULAR,
        'challenge.completed',
      );
      expect(result).toEqual({
        continueChallenge: { id: 'c1', title: 'Desafio 1' },
        progress: { completedChallengesCount: 4 },
      });
    });
  });

  describe('getTeacherHome', () => {
    it('never returns which students were active, only an aggregate count', async () => {
      schoolsService.findClassroomsByTeacher.mockResolvedValue([
        { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-7' } as any,
      ]);
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        { student: { pseudonymId: 'p1' } },
        { student: { pseudonymId: 'p2' } },
      ] as any);
      eventsService.countDistinctStudentsActiveSince.mockResolvedValue(2);

      const result = await service.getTeacherHome('teacher-1');

      expect(result).toEqual([
        { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-7', activeStudentsToday: 2 },
      ]);
      expect(JSON.stringify(result)).not.toContain('p1');
    });

    it('passes the pseudonym ids of the classroom roster, not user ids', async () => {
      schoolsService.findClassroomsByTeacher.mockResolvedValue([
        { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-7' } as any,
      ]);
      schoolsService.findActiveStudentsInClassroom.mockResolvedValue([
        { student: { pseudonymId: 'p1' } },
      ] as any);
      eventsService.countDistinctStudentsActiveSince.mockResolvedValue(1);

      await service.getTeacherHome('teacher-1');

      expect(eventsService.countDistinctStudentsActiveSince).toHaveBeenCalledWith(
        ['p1'],
        expect.any(Date),
      );
    });
  });

  describe('getAdminHome', () => {
    it('aggregates counts without any per-student detail', async () => {
      schoolsService.countSchools.mockResolvedValue(2);
      schoolsService.countClassrooms.mockResolvedValue(5);
      usersService.countAll.mockResolvedValue(80);

      const result = await service.getAdminHome();

      expect(result).toEqual({ schoolsCount: 2, classroomsCount: 5, usersCount: 80 });
    });
  });
});
