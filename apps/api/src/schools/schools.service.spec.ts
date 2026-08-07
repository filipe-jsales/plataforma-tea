import { Repository, SelectQueryBuilder } from 'typeorm';
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
    schoolsRepository = {
      count: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<School>>;
    classroomsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Classroom>>;
    enrollmentsRepository = {
      find: jest.fn(),
      count: jest.fn(),
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

  it('findClassroomsBySchool loads the teacher relation (6.2 needs the responsible teacher name)', async () => {
    classroomsRepository.find.mockResolvedValue([]);

    await service.findClassroomsBySchool('school-1');

    expect(classroomsRepository.find).toHaveBeenCalledWith({
      where: { schoolId: 'school-1' },
      relations: { teacher: true },
    });
  });

  it('findAllSchools lists every school, no filter', async () => {
    schoolsRepository.find.mockResolvedValue([]);

    await service.findAllSchools();

    expect(schoolsRepository.find).toHaveBeenCalledWith();
  });

  describe('countDistinctTeachersBySchool', () => {
    it('counts only distinct, non-null teacherId within the school', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '2' }),
      } as unknown as jest.Mocked<SelectQueryBuilder<Classroom>>;
      classroomsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.countDistinctTeachersBySchool('school-1');

      expect(result).toBe(2);
      expect(queryBuilder.where).toHaveBeenCalledWith('classroom.schoolId = :schoolId', {
        schoolId: 'school-1',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('classroom.teacherId IS NOT NULL');
    });

    it('returns 0 when the query yields no raw row', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(undefined),
      } as unknown as jest.Mocked<SelectQueryBuilder<Classroom>>;
      classroomsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(service.countDistinctTeachersBySchool('school-1')).resolves.toBe(0);
    });
  });

  it('findActiveStudentsBySchool scopes by the classroom relation and active=true, loading the student', async () => {
    enrollmentsRepository.find.mockResolvedValue([]);

    await service.findActiveStudentsBySchool('school-1');

    expect(enrollmentsRepository.find).toHaveBeenCalledWith({
      where: { classroom: { schoolId: 'school-1' }, active: true },
      relations: { student: true },
    });
  });

  it('findClassroomById looks up a single classroom by id, no relations', async () => {
    classroomsRepository.findOne.mockResolvedValue(null);

    await service.findClassroomById('classroom-1');

    expect(classroomsRepository.findOne).toHaveBeenCalledWith({ where: { id: 'classroom-1' } });
  });

  it('countActiveStudentsInClassroom scopes by classroom and active=true only', async () => {
    enrollmentsRepository.count.mockResolvedValue(7);

    await expect(service.countActiveStudentsInClassroom('classroom-1')).resolves.toBe(7);
    expect(enrollmentsRepository.count).toHaveBeenCalledWith({
      where: { classroomId: 'classroom-1', active: true },
    });
  });
});
