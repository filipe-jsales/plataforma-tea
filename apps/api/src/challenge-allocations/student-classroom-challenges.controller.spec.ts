import { ChallengeAllocationsService } from './challenge-allocations.service';
import { StudentClassroomChallengesController } from './student-classroom-challenges.controller';

describe('StudentClassroomChallengesController', () => {
  let controller: StudentClassroomChallengesController;
  let allocationsService: jest.Mocked<ChallengeAllocationsService>;

  beforeEach(() => {
    allocationsService = {
      findAvailableForStudent: jest.fn(),
      markChallengeViewed: jest.fn(),
    } as unknown as jest.Mocked<ChallengeAllocationsService>;

    controller = new StudentClassroomChallengesController(allocationsService);
  });

  it('scopes the lookup to the authenticated student, never a client-supplied id', async () => {
    const challenges = [
      { id: 'c1', title: 'Hexágonos', prompt: 'Monte um desenho com 6 lados.', isNew: true },
    ];
    allocationsService.findAvailableForStudent.mockResolvedValue(challenges);

    const req = { user: { sub: 'student-1', pseudonymId: 'p1', role: 'student' as any } };
    await expect(controller.getClassroomChallenges(req)).resolves.toBe(challenges);
    expect(allocationsService.findAvailableForStudent).toHaveBeenCalledWith('student-1');
  });

  it('E1 (AC2) — markViewed scopes to the authenticated student, never a client-supplied id', async () => {
    allocationsService.markChallengeViewed.mockResolvedValue(undefined);

    const req = { user: { sub: 'student-1', pseudonymId: 'p1', role: 'student' as any } };
    await controller.markViewed('challenge-1', req);

    expect(allocationsService.markChallengeViewed).toHaveBeenCalledWith('student-1', 'challenge-1');
  });
});
