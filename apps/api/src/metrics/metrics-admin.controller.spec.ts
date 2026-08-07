import { MetricsAdminController } from './metrics-admin.controller';
import { MetricsAdminService } from './metrics-admin.service';

describe('MetricsAdminController', () => {
  let controller: MetricsAdminController;
  let metricsAdminService: jest.Mocked<MetricsAdminService>;

  beforeEach(() => {
    metricsAdminService = {
      listSchoolsOverview: jest.fn(),
      getSchoolClassrooms: jest.fn(),
    } as unknown as jest.Mocked<MetricsAdminService>;

    controller = new MetricsAdminController(metricsAdminService);
  });

  it('listSchools delegates straight to the service, no extra transformation', async () => {
    const overview = [{ id: 's1', name: 'Escola Azul' }] as any;
    metricsAdminService.listSchoolsOverview.mockResolvedValue(overview);

    await expect(controller.listSchools()).resolves.toBe(overview);
  });

  it('getSchoolClassrooms passes the :schoolId param through to the service', async () => {
    const classrooms = [{ id: 'c1', name: 'Turma A' }] as any;
    metricsAdminService.getSchoolClassrooms.mockResolvedValue(classrooms);

    const result = await controller.getSchoolClassrooms('school-1');

    expect(metricsAdminService.getSchoolClassrooms).toHaveBeenCalledWith('school-1');
    expect(result).toBe(classrooms);
  });
});
