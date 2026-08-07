import { MetricsAdminChallengeService } from './metrics-admin-challenge.service';
import { MetricsAdminController } from './metrics-admin.controller';
import { MetricsAdminService } from './metrics-admin.service';

describe('MetricsAdminController', () => {
  let controller: MetricsAdminController;
  let metricsAdminService: jest.Mocked<MetricsAdminService>;
  let metricsAdminChallengeService: jest.Mocked<MetricsAdminChallengeService>;

  beforeEach(() => {
    metricsAdminService = {
      listSchoolsOverview: jest.fn(),
      getSchoolClassrooms: jest.fn(),
    } as unknown as jest.Mocked<MetricsAdminService>;
    metricsAdminChallengeService = {
      listChallenges: jest.fn(),
      getChallengeReport: jest.fn(),
    } as unknown as jest.Mocked<MetricsAdminChallengeService>;

    controller = new MetricsAdminController(metricsAdminService, metricsAdminChallengeService);
  });

  it('listSchools delegates straight to the service, no extra transformation', async () => {
    const overview = [{ id: 's1', name: 'Escola Azul' }] as any;
    metricsAdminService.listSchoolsOverview.mockResolvedValue(overview);

    await expect(controller.listSchools()).resolves.toBe(overview);
  });

  it('listChallenges delegates straight to the service, no extra transformation', async () => {
    const challenges = [{ id: 'c1', title: 'Monte o quadrado' }] as any;
    metricsAdminChallengeService.listChallenges.mockResolvedValue(challenges);

    await expect(controller.listChallenges()).resolves.toBe(challenges);
  });

  it('getChallengeReport passes the :challengeId param through to the service', async () => {
    const report = { challengeId: 'c1' } as any;
    metricsAdminChallengeService.getChallengeReport.mockResolvedValue(report);

    const result = await controller.getChallengeReport('c1');

    expect(metricsAdminChallengeService.getChallengeReport).toHaveBeenCalledWith('c1');
    expect(result).toBe(report);
  });

  it('getSchoolClassrooms passes the :schoolId param through to the service', async () => {
    const classrooms = [{ id: 'c1', name: 'Turma A' }] as any;
    metricsAdminService.getSchoolClassrooms.mockResolvedValue(classrooms);

    const result = await controller.getSchoolClassrooms('school-1');

    expect(metricsAdminService.getSchoolClassrooms).toHaveBeenCalledWith('school-1');
    expect(result).toBe(classrooms);
  });
});
