import { ChallengeAllocationsService } from './challenge-allocations.service';
import { TeacherChallengeAllocationsController } from './teacher-challenge-allocations.controller';

describe('TeacherChallengeAllocationsController', () => {
  let controller: TeacherChallengeAllocationsController;
  let allocationsService: jest.Mocked<ChallengeAllocationsService>;

  const req = { user: { sub: 'teacher-1', pseudonymId: 'p1', role: 'teacher' as any } };

  beforeEach(() => {
    allocationsService = {
      listForTeacherChallenge: jest.fn(),
      allocate: jest.fn(),
      deallocate: jest.fn(),
    } as unknown as jest.Mocked<ChallengeAllocationsService>;

    controller = new TeacherChallengeAllocationsController(allocationsService);
  });

  it('list scopes to the authenticated teacher, never trusting a client-supplied teacher id', async () => {
    const summaries = [{ classroomId: 'c1', classroomName: 'Turma A', classroomJoinCode: 'AZUL-1' }];
    allocationsService.listForTeacherChallenge.mockResolvedValue(summaries);

    await expect(controller.list('challenge-1', req)).resolves.toBe(summaries);
    expect(allocationsService.listForTeacherChallenge).toHaveBeenCalledWith('challenge-1', 'teacher-1');
  });

  it('allocate passes challengeId, teacher id and the classroomId from the DTO', async () => {
    const summary = { classroomId: 'c1', classroomName: 'Turma A', classroomJoinCode: 'AZUL-1' };
    allocationsService.allocate.mockResolvedValue(summary);

    await controller.allocate('challenge-1', { classroomId: 'c1' }, req);

    expect(allocationsService.allocate).toHaveBeenCalledWith('challenge-1', 'teacher-1', 'c1');
  });

  it('deallocate passes challengeId, classroomId and the authenticated teacher id', async () => {
    await controller.deallocate('challenge-1', 'c1', req);

    expect(allocationsService.deallocate).toHaveBeenCalledWith('challenge-1', 'teacher-1', 'c1');
  });
});
