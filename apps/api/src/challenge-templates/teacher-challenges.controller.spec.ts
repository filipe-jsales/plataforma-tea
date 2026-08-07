import { TeacherChallengesController } from './teacher-challenges.controller';
import { ChallengeTemplatesService } from './challenge-templates.service';

describe('TeacherChallengesController', () => {
  let controller: TeacherChallengesController;
  let templatesService: jest.Mocked<ChallengeTemplatesService>;

  const req = { user: { sub: 'teacher-1', pseudonymId: 'p1', role: 'teacher' as any } };

  beforeEach(() => {
    templatesService = {
      listMine: jest.fn(),
      getMineOrThrow: jest.fn(),
      updateMine: jest.fn(),
      removeMine: jest.fn(),
    } as unknown as jest.Mocked<ChallengeTemplatesService>;

    controller = new TeacherChallengesController(templatesService);
  });

  it('listMine scopes the list to the authenticated teacher', async () => {
    const list = [{ id: 'c1' }] as any;
    templatesService.listMine.mockResolvedValue(list);

    await expect(controller.listMine(req)).resolves.toBe(list);
    expect(templatesService.listMine).toHaveBeenCalledWith('teacher-1');
  });

  it('getMine scopes ownership check to the authenticated teacher, never trusting the URL alone', async () => {
    const detail = { id: 'c1' } as any;
    templatesService.getMineOrThrow.mockResolvedValue(detail);

    await controller.getMine('c1', req);

    expect(templatesService.getMineOrThrow).toHaveBeenCalledWith('c1', 'teacher-1');
  });

  it('updateMine passes id, teacher id and DTO through', async () => {
    const summary = { id: 'c1' } as any;
    templatesService.updateMine.mockResolvedValue(summary);

    await controller.updateMine('c1', { title: 'Novo título', params: { sides: 5 } }, req);

    expect(templatesService.updateMine).toHaveBeenCalledWith('c1', 'teacher-1', {
      title: 'Novo título',
      params: { sides: 5 },
    });
  });

  it('removeMine scopes deletion to the authenticated teacher', async () => {
    await controller.removeMine('c1', req);

    expect(templatesService.removeMine).toHaveBeenCalledWith('c1', 'teacher-1');
  });
});
