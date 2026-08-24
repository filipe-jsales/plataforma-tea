import { MetricsAdminChallengeService } from './metrics-admin-challenge.service';
import { MetricsAdminController } from './metrics-admin.controller';
import { MetricsAdminExportService } from './metrics-admin-export.service';
import { MetricsAdminMiniGameService } from './metrics-admin-minigame.service';
import { MetricsAdminService } from './metrics-admin.service';

function mockResponse() {
  return { set: jest.fn() };
}

describe('MetricsAdminController', () => {
  let controller: MetricsAdminController;
  let metricsAdminService: jest.Mocked<MetricsAdminService>;
  let metricsAdminChallengeService: jest.Mocked<MetricsAdminChallengeService>;
  let metricsAdminExportService: jest.Mocked<MetricsAdminExportService>;
  let metricsAdminMiniGameService: jest.Mocked<MetricsAdminMiniGameService>;

  beforeEach(() => {
    metricsAdminService = {
      listSchoolsOverview: jest.fn(),
      getSchoolClassrooms: jest.fn(),
    } as unknown as jest.Mocked<MetricsAdminService>;
    metricsAdminChallengeService = {
      listChallenges: jest.fn(),
      getChallengeReport: jest.fn(),
    } as unknown as jest.Mocked<MetricsAdminChallengeService>;
    metricsAdminExportService = {
      exportEvents: jest.fn(),
    } as unknown as jest.Mocked<MetricsAdminExportService>;
    metricsAdminMiniGameService = {
      listMiniGameLevels: jest.fn(),
      getMiniGameLevelReport: jest.fn(),
    } as unknown as jest.Mocked<MetricsAdminMiniGameService>;

    controller = new MetricsAdminController(
      metricsAdminService,
      metricsAdminChallengeService,
      metricsAdminExportService,
      metricsAdminMiniGameService,
    );
  });

  it('listMiniGames delegates straight to the service, no extra transformation', async () => {
    const levels = [{ id: 'l1', title: 'Observe o pedido pronto' }] as any;
    metricsAdminMiniGameService.listMiniGameLevels.mockResolvedValue(levels);

    await expect(controller.listMiniGames()).resolves.toBe(levels);
  });

  it('getMiniGameLevelReport passes the :levelId param through to the service', async () => {
    const report = { levelId: 'l1' } as any;
    metricsAdminMiniGameService.getMiniGameLevelReport.mockResolvedValue(report);

    const result = await controller.getMiniGameLevelReport('l1');

    expect(metricsAdminMiniGameService.getMiniGameLevelReport).toHaveBeenCalledWith('l1');
    expect(result).toBe(report);
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

    expect(
      metricsAdminChallengeService.getChallengeReport,
    ).toHaveBeenCalledWith('c1');
    expect(result).toBe(report);
  });

  it('getSchoolClassrooms passes the :schoolId param through to the service', async () => {
    const classrooms = [{ id: 'c1', name: 'Turma A' }] as any;
    metricsAdminService.getSchoolClassrooms.mockResolvedValue(classrooms);

    const result = await controller.getSchoolClassrooms('school-1');

    expect(metricsAdminService.getSchoolClassrooms).toHaveBeenCalledWith(
      'school-1',
    );
    expect(result).toBe(classrooms);
  });

  describe('exportEvents (6.6)', () => {
    it('passes the query DTO and the authenticated admin id (req.user.sub) to the service', async () => {
      const result = { rows: [], page: 1, pageSize: 500, hasMore: false };
      metricsAdminExportService.exportEvents.mockResolvedValue(result);
      const query = { challengeId: 'c1', format: 'json' } as any;

      const response = await controller.exportEvents(
        query,
        { user: { sub: 'admin-1' } } as any,
        mockResponse() as any,
      );

      expect(metricsAdminExportService.exportEvents).toHaveBeenCalledWith(
        query,
        'admin-1',
      );
      expect(response).toBe(result);
    });

    it('returns the JSON result as-is when format is "json" (or omitted), no CSV headers set', async () => {
      const result = {
        rows: [{ id: 'e1' }],
        page: 1,
        pageSize: 500,
        hasMore: false,
      };
      metricsAdminExportService.exportEvents.mockResolvedValue(result as any);
      const res = mockResponse();

      const response = await controller.exportEvents(
        {},
        { user: { sub: 'admin-1' } } as any,
        res as any,
      );

      expect(response).toBe(result);
      expect(res.set).not.toHaveBeenCalled();
    });

    it('serializes to CSV and sets download headers when format is "csv"', async () => {
      const result = {
        rows: [
          {
            id: 'e1',
            studentPseudoId: 'p1',
            category: 'RD-P',
            type: 'program_executed',
            payload: { attempts: 2 },
            sessionId: null,
            challengeId: 'c1',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 1,
        pageSize: 500,
        hasMore: false,
      };
      metricsAdminExportService.exportEvents.mockResolvedValue(result);
      const res = mockResponse();

      const response = await controller.exportEvents(
        { format: 'csv' } as any,
        { user: { sub: 'admin-1' } } as any,
        res as any,
      );

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Type': 'text/csv; charset=utf-8' }),
      );
      expect(typeof response).toBe('string');
      expect(response as unknown as string).toContain(
        'id,studentPseudoId,category,type,payload,sessionId,challengeId,createdAt',
      );
      expect(response as unknown as string).toContain(
        'e1,p1,RD-P,program_executed',
      );
    });
  });
});
