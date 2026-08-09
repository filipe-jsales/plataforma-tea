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
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<School>>;
    classroomsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Classroom>>;
    enrollmentsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Enrollment>>;

    service = new SchoolsService(
      schoolsRepository,
      classroomsRepository,
      enrollmentsRepository,
    );
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

    expect(classroomsRepository.findOne).toHaveBeenCalledWith({
      where: { joinCode: 'AZUL-7' },
    });
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
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'classroom.schoolId = :schoolId',
        {
          schoolId: 'school-1',
        },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'classroom.teacherId IS NOT NULL',
      );
    });

    it('returns 0 when the query yields no raw row', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(undefined),
      } as unknown as jest.Mocked<SelectQueryBuilder<Classroom>>;
      classroomsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        service.countDistinctTeachersBySchool('school-1'),
      ).resolves.toBe(0);
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

    expect(classroomsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'classroom-1' },
    });
  });

  it('countActiveStudentsInClassroom scopes by classroom and active=true only', async () => {
    enrollmentsRepository.count.mockResolvedValue(7);

    await expect(
      service.countActiveStudentsInClassroom('classroom-1'),
    ).resolves.toBe(7);
    expect(enrollmentsRepository.count).toHaveBeenCalledWith({
      where: { classroomId: 'classroom-1', active: true },
    });
  });

  it('findSchoolById looks up a single school by id (6.6)', async () => {
    schoolsRepository.findOne.mockResolvedValue(null);

    await service.findSchoolById('school-1');

    expect(schoolsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'school-1' },
    });
  });

  describe('findAllStudentPseudoIdsBySchool (6.6)', () => {
    it('returns distinct pseudonyms across every enrollment, active or not (unlike findActiveStudentsBySchool)', async () => {
      const queryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ pseudonymId: 'p1' }, { pseudonymId: 'p2' }]),
      } as unknown as jest.Mocked<SelectQueryBuilder<Enrollment>>;
      enrollmentsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAllStudentPseudoIdsBySchool('school-1');

      expect(result).toEqual(['p1', 'p2']);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'classroom.schoolId = :schoolId',
        {
          schoolId: 'school-1',
        },
      );
    });

    it('returns an empty array for a school with no enrollment ever, never an error', async () => {
      const queryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as unknown as jest.Mocked<SelectQueryBuilder<Enrollment>>;
      enrollmentsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        service.findAllStudentPseudoIdsBySchool('school-1'),
      ).resolves.toEqual([]);
    });
  });

  describe('hasActiveStudentWithNameInClassroom (1.2)', () => {
    it('normalizes case/whitespace before comparing', async () => {
      const queryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      } as unknown as jest.Mocked<SelectQueryBuilder<Enrollment>>;
      enrollmentsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.hasActiveStudentWithNameInClassroom(
        'classroom-1',
        '  João Silva ',
      );

      expect(result).toBe(true);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(TRIM(student.displayName)) = :normalized',
        { normalized: 'joão silva' },
      );
    });

    it('returns false when no active enrollment matches', async () => {
      const queryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      } as unknown as jest.Mocked<SelectQueryBuilder<Enrollment>>;
      enrollmentsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        service.hasActiveStudentWithNameInClassroom(
          'classroom-1',
          'Novo Aluno',
        ),
      ).resolves.toBe(false);
    });
  });

  describe('createEnrollment (1.2/1.5)', () => {
    it('creates an active enrollment for the student/classroom pair', async () => {
      const created = { id: 'e1' } as Enrollment;
      enrollmentsRepository.create.mockReturnValue(created);
      enrollmentsRepository.save.mockResolvedValue(created);

      const result = await service.createEnrollment('student-1', 'classroom-1');

      expect(enrollmentsRepository.create).toHaveBeenCalledWith({
        studentId: 'student-1',
        classroomId: 'classroom-1',
        active: true,
      });
      expect(result).toBe(created);
    });
  });

  describe('endEnrollment (1.5)', () => {
    it('marks the enrollment inactive and stamps unenrolledAt, never deleting it', async () => {
      const enrollment = {
        id: 'e1',
        active: true,
        unenrolledAt: null,
      } as Enrollment;
      enrollmentsRepository.save.mockImplementation(
        async (e) => e as Enrollment,
      );

      const result = await service.endEnrollment(enrollment);

      expect(result.active).toBe(false);
      expect(result.unenrolledAt).toBeInstanceOf(Date);
      expect(enrollmentsRepository.save).toHaveBeenCalledWith(enrollment);
    });
  });

  describe('findSingleActiveEnrollment (1.5)', () => {
    it('looks up the one active enrollment for a student', async () => {
      enrollmentsRepository.findOne.mockResolvedValue(null);

      await service.findSingleActiveEnrollment('student-1');

      expect(enrollmentsRepository.findOne).toHaveBeenCalledWith({
        where: { studentId: 'student-1', active: true },
      });
    });
  });

  describe('findClassroomsBySchoolForSelector (1.2/1.5 admin)', () => {
    it('lists classrooms for a school ordered by name, no teacher relation', async () => {
      classroomsRepository.find.mockResolvedValue([]);

      await service.findClassroomsBySchoolForSelector('school-1');

      expect(classroomsRepository.find).toHaveBeenCalledWith({
        where: { schoolId: 'school-1' },
        order: { name: 'ASC' },
      });
    });
  });
});
