import { Repository } from 'typeorm';
import { Classroom } from './entities/classroom.entity';
import { Enrollment } from './entities/enrollment.entity';
import { School } from './entities/school.entity';
import { SchoolsService } from './schools.service';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let schoolsRepository: jest.Mocked<Repository<School>>;
  let classroomsRepository: jest.Mocked<Repository<Classroom>>;
  let enrollmentsRepository: jest.Mocked<Repository<Enrollment>>;

  beforeEach(() => {
    schoolsRepository = { count: jest.fn() } as unknown as jest.Mocked<Repository<School>>;
    classroomsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<Repository<Classroom>>;
    enrollmentsRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<Enrollment>>;

    service = new SchoolsService(schoolsRepository, classroomsRepository, enrollmentsRepository);
  });

  it('findActiveEnrollmentsByStudent filters by student and active=true only', async () => {
    enrollmentsRepository.find.mockResolvedValue([]);

    await service.findActiveEnrollmentsByStudent('student-1');

    expect(enrollmentsRepository.find).toHaveBeenCalledWith({
      where: { studentId: 'student-1', active: true },
      relations: { classroom: true },
    });
  });

  it('findActiveStudentsInClassroom scopes by classroom and active=true, including avatar', async () => {
    enrollmentsRepository.find.mockResolvedValue([]);

    await service.findActiveStudentsInClassroom('classroom-1');

    expect(enrollmentsRepository.find).toHaveBeenCalledWith({
      where: { classroomId: 'classroom-1', active: true },
      relations: { student: { avatar: true } },
    });
  });

  it('findClassroomByJoinCode looks up a single classroom by its join code', async () => {
    classroomsRepository.findOne.mockResolvedValue(null);

    await service.findClassroomByJoinCode('AZUL-7');

    expect(classroomsRepository.findOne).toHaveBeenCalledWith({ where: { joinCode: 'AZUL-7' } });
  });

  it('countSchools and countClassrooms delegate to their repositories', async () => {
    schoolsRepository.count.mockResolvedValue(1);
    classroomsRepository.count.mockResolvedValue(3);

    await expect(service.countSchools()).resolves.toBe(1);
    await expect(service.countClassrooms()).resolves.toBe(3);
  });
});
