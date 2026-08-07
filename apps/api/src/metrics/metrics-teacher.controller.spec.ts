import { MetricsTeacherController } from './metrics-teacher.controller';
import { MetricsTeacherService } from './metrics-teacher.service';

describe('MetricsTeacherController', () => {
  let controller: MetricsTeacherController;
  let metricsTeacherService: jest.Mocked<MetricsTeacherService>;

  beforeEach(() => {
    metricsTeacherService = {
      getStudentsProgress: jest.fn(),
      getClassroomSummary: jest.fn(),
    } as unknown as jest.Mocked<MetricsTeacherService>;

    controller = new MetricsTeacherController(metricsTeacherService);
  });

  it('getStudentsProgress passes the classroomId param and the authenticated teacher id (req.user.sub), never a client-supplied teacherId', async () => {
    const overview = [{ studentPseudoId: 'p1' }] as any;
    metricsTeacherService.getStudentsProgress.mockResolvedValue(overview);

    const result = await controller.getStudentsProgress('classroom-1', {
      user: { sub: 'teacher-1', pseudonymId: 'x', role: 'teacher' } as any,
    });

    expect(metricsTeacherService.getStudentsProgress).toHaveBeenCalledWith('classroom-1', 'teacher-1');
    expect(result).toBe(overview);
  });

  it('getClassroomSummary passes the classroomId param and the authenticated teacher id', async () => {
    const summary = { totalStudents: 0 } as any;
    metricsTeacherService.getClassroomSummary.mockResolvedValue(summary);

    const result = await controller.getClassroomSummary('classroom-1', {
      user: { sub: 'teacher-1', pseudonymId: 'x', role: 'teacher' } as any,
    });

    expect(metricsTeacherService.getClassroomSummary).toHaveBeenCalledWith('classroom-1', 'teacher-1');
    expect(result).toBe(summary);
  });
});
