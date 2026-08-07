import { ChallengeTemplatesController } from './challenge-templates.controller';
import { ChallengeTemplatesService } from './challenge-templates.service';

describe('ChallengeTemplatesController', () => {
  let controller: ChallengeTemplatesController;
  let templatesService: jest.Mocked<ChallengeTemplatesService>;

  beforeEach(() => {
    templatesService = {
      listTemplates: jest.fn(),
      getTemplateDetail: jest.fn(),
      preview: jest.fn(),
      createChallenge: jest.fn(),
    } as unknown as jest.Mocked<ChallengeTemplatesService>;

    controller = new ChallengeTemplatesController(templatesService);
  });

  it('listTemplates delegates straight to the service', async () => {
    const templates = [{ id: 't1' }] as any;
    templatesService.listTemplates.mockResolvedValue(templates);

    await expect(controller.listTemplates()).resolves.toBe(templates);
  });

  it('getTemplateDetail passes the id through', async () => {
    const detail = { id: 't1', parameterSchema: [] } as any;
    templatesService.getTemplateDetail.mockResolvedValue(detail);

    await expect(controller.getTemplateDetail('t1')).resolves.toBe(detail);
    expect(templatesService.getTemplateDetail).toHaveBeenCalledWith('t1');
  });

  it('preview passes the template id and params through, never the whole request body raw', async () => {
    const result = { valid: true, errors: [], goal: { sides: 4 } } as any;
    templatesService.preview.mockResolvedValue(result);

    await controller.preview('t1', { params: { sides: 4 } });

    expect(templatesService.preview).toHaveBeenCalledWith('t1', { sides: 4 });
  });

  it('createChallenge scopes creation to the authenticated teacher (req.user.sub), never a client-supplied id', async () => {
    const summary = { id: 'c1' } as any;
    templatesService.createChallenge.mockResolvedValue(summary);

    await controller.createChallenge(
      't1',
      { title: 'Título', params: { sides: 4 } },
      { user: { sub: 'teacher-1', pseudonymId: 'p1', role: 'teacher' as any } },
    );

    expect(templatesService.createChallenge).toHaveBeenCalledWith('t1', 'teacher-1', {
      title: 'Título',
      params: { sides: 4 },
    });
  });
});
