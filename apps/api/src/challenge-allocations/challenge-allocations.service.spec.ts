import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ChallengesService } from '../challenges/challenges.service';
import { Challenge } from '../challenges/entities/challenge.entity';
import { ChallengeViewsService } from '../challenge-views/challenge-views.service';
import { Classroom } from '../schools/entities/classroom.entity';
import { Enrollment } from '../schools/entities/enrollment.entity';
import { SchoolsService } from '../schools/schools.service';
import { ChallengeAllocationsService } from './challenge-allocations.service';
import { ChallengeClassroomAllocation } from './entities/challenge-classroom-allocation.entity';

describe('ChallengeAllocationsService', () => {
  let service: ChallengeAllocationsService;
  let allocationsRepository: jest.Mocked<Repository<ChallengeClassroomAllocation>>;
  let challengesService: jest.Mocked<ChallengesService>;
  let schoolsService: jest.Mocked<SchoolsService>;
  let challengeViewsService: jest.Mocked<ChallengeViewsService>;

  const ownedChallenge = { id: 'challenge-1', createdByUserId: 'teacher-1' } as unknown as Challenge;
  const ownClassroom = { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-1', teacherId: 'teacher-1' } as Classroom;
  const otherTeacherClassroom = { id: 'classroom-2', name: 'Turma B', joinCode: 'AZUL-2', teacherId: 'teacher-2' } as Classroom;

  beforeEach(() => {
    allocationsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<ChallengeClassroomAllocation>>;
    challengesService = { findByIdForOwner: jest.fn() } as unknown as jest.Mocked<ChallengesService>;
    schoolsService = {
      findClassroomById: jest.fn(),
      findActiveEnrollmentsByStudent: jest.fn(),
    } as unknown as jest.Mocked<SchoolsService>;
    challengeViewsService = {
      findViewedChallengeIds: jest.fn().mockResolvedValue(new Set()),
      markViewed: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ChallengeViewsService>;

    service = new ChallengeAllocationsService(
      allocationsRepository,
      challengesService,
      schoolsService,
      challengeViewsService,
    );
  });

  describe('listForTeacherChallenge', () => {
    it('throws NotFoundException when the challenge does not belong to this teacher', async () => {
      challengesService.findByIdForOwner.mockResolvedValue(null);

      await expect(service.listForTeacherChallenge('challenge-1', 'teacher-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(allocationsRepository.find).not.toHaveBeenCalled();
    });

    it('returns the classrooms the challenge is allocated to', async () => {
      challengesService.findByIdForOwner.mockResolvedValue(ownedChallenge);
      allocationsRepository.find.mockResolvedValue([
        { classroom: ownClassroom } as ChallengeClassroomAllocation,
      ]);

      const result = await service.listForTeacherChallenge('challenge-1', 'teacher-1');

      expect(result).toEqual([{ classroomId: 'classroom-1', classroomName: 'Turma A', classroomJoinCode: 'AZUL-1' }]);
    });
  });

  describe('allocate', () => {
    it('AC1 — rejects allocating to a classroom that is not this teacher\'s own, never "any school classroom"', async () => {
      challengesService.findByIdForOwner.mockResolvedValue(ownedChallenge);
      schoolsService.findClassroomById.mockResolvedValue(otherTeacherClassroom);

      await expect(service.allocate('challenge-1', 'teacher-1', 'classroom-2')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(allocationsRepository.save).not.toHaveBeenCalled();
    });

    it('rejects allocating a challenge that does not belong to this teacher', async () => {
      challengesService.findByIdForOwner.mockResolvedValue(null);

      await expect(service.allocate('challenge-1', 'teacher-1', 'classroom-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(schoolsService.findClassroomById).not.toHaveBeenCalled();
    });

    it('rejects a duplicate allocation with a clear message instead of a raw unique-constraint error', async () => {
      challengesService.findByIdForOwner.mockResolvedValue(ownedChallenge);
      schoolsService.findClassroomById.mockResolvedValue(ownClassroom);
      allocationsRepository.findOne.mockResolvedValue({} as ChallengeClassroomAllocation);

      await expect(service.allocate('challenge-1', 'teacher-1', 'classroom-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(allocationsRepository.save).not.toHaveBeenCalled();
    });

    it('AC7 — creates the allocation row carrying challengeId/classroomId/allocatedByUserId (the RD-C-equivalent record)', async () => {
      challengesService.findByIdForOwner.mockResolvedValue(ownedChallenge);
      schoolsService.findClassroomById.mockResolvedValue(ownClassroom);
      allocationsRepository.findOne.mockResolvedValue(null);
      const created = { id: 'a1' } as ChallengeClassroomAllocation;
      allocationsRepository.create.mockReturnValue(created);
      allocationsRepository.save.mockResolvedValue(created);

      const result = await service.allocate('challenge-1', 'teacher-1', 'classroom-1');

      expect(allocationsRepository.create).toHaveBeenCalledWith({
        challengeId: 'challenge-1',
        classroomId: 'classroom-1',
        allocatedByUserId: 'teacher-1',
      });
      expect(result).toEqual({ classroomId: 'classroom-1', classroomName: 'Turma A', classroomJoinCode: 'AZUL-1' });
    });
  });

  describe('deallocate', () => {
    it('AC5 — removes only the link row, never the challenge itself', async () => {
      challengesService.findByIdForOwner.mockResolvedValue(ownedChallenge);
      const allocation = { id: 'a1' } as ChallengeClassroomAllocation;
      allocationsRepository.findOne.mockResolvedValue(allocation);

      await service.deallocate('challenge-1', 'teacher-1', 'classroom-1');

      expect(allocationsRepository.remove).toHaveBeenCalledWith(allocation);
    });

    it('throws NotFoundException when the challenge was never allocated to that classroom', async () => {
      challengesService.findByIdForOwner.mockResolvedValue(ownedChallenge);
      allocationsRepository.findOne.mockResolvedValue(null);

      await expect(service.deallocate('challenge-1', 'teacher-1', 'classroom-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects deallocating a challenge that does not belong to this teacher', async () => {
      challengesService.findByIdForOwner.mockResolvedValue(null);

      await expect(service.deallocate('challenge-1', 'teacher-1', 'classroom-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(allocationsRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findAvailableForStudent', () => {
    it('AC3 — returns an empty list for a student with no active enrollment, never an error', async () => {
      schoolsService.findActiveEnrollmentsByStudent.mockResolvedValue([]);

      await expect(service.findAvailableForStudent('student-1')).resolves.toEqual([]);
      expect(allocationsRepository.find).not.toHaveBeenCalled();
    });

    it('AC4 — scopes to the classroom of the first active enrollment (MVP: 1 student = 1 classroom)', async () => {
      schoolsService.findActiveEnrollmentsByStudent.mockResolvedValue([
        { classroomId: 'classroom-1' } as Enrollment,
      ]);
      allocationsRepository.find.mockResolvedValue([
        {
          challenge: { id: 'c1', title: 'Hexágonos', prompt: 'Monte um desenho com 6 lados.' },
        } as ChallengeClassroomAllocation,
      ]);

      const result = await service.findAvailableForStudent('student-1');

      expect(allocationsRepository.find).toHaveBeenCalledWith({
        where: { classroomId: 'classroom-1' },
        relations: { challenge: true },
        order: { allocatedAt: 'DESC' },
      });
      expect(result).toEqual([
        { id: 'c1', title: 'Hexágonos', prompt: 'Monte um desenho com 6 lados.', isNew: true },
      ]);
    });

    it('AC3 — a challenge never allocated to any classroom never appears for any student', async () => {
      schoolsService.findActiveEnrollmentsByStudent.mockResolvedValue([
        { classroomId: 'classroom-1' } as Enrollment,
      ]);
      allocationsRepository.find.mockResolvedValue([]);

      await expect(service.findAvailableForStudent('student-1')).resolves.toEqual([]);
    });

    it('E1 (AC1/AC2) — isNew is false for a challenge the student has already viewed', async () => {
      schoolsService.findActiveEnrollmentsByStudent.mockResolvedValue([
        { classroomId: 'classroom-1' } as Enrollment,
      ]);
      allocationsRepository.find.mockResolvedValue([
        { challenge: { id: 'c1', title: 'Hexágonos', prompt: 'p' } } as ChallengeClassroomAllocation,
        { challenge: { id: 'c2', title: 'Triângulos', prompt: 'p' } } as ChallengeClassroomAllocation,
      ]);
      challengeViewsService.findViewedChallengeIds.mockResolvedValue(new Set(['c1']));

      const result = await service.findAvailableForStudent('student-1');

      expect(challengeViewsService.findViewedChallengeIds).toHaveBeenCalledWith('student-1', ['c1', 'c2']);
      expect(result).toEqual([
        { id: 'c1', title: 'Hexágonos', prompt: 'p', isNew: false },
        { id: 'c2', title: 'Triângulos', prompt: 'p', isNew: true },
      ]);
    });
  });

  describe('markChallengeViewed (E1, AC2)', () => {
    it('delegates to ChallengeViewsService, scoped to the given student', async () => {
      await service.markChallengeViewed('student-1', 'challenge-1');

      expect(challengeViewsService.markViewed).toHaveBeenCalledWith('student-1', 'challenge-1');
    });
  });
});
