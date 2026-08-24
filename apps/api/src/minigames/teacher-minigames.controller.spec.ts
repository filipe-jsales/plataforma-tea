import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { MinigamesService } from './minigames.service';
import { TeacherMinigamesController } from './teacher-minigames.controller';

describe('TeacherMinigamesController', () => {
  let controller: TeacherMinigamesController;
  let service: jest.Mocked<MinigamesService>;

  beforeEach(() => {
    service = {
      findByConceptId: jest.fn(),
      updateLevelConfig: jest.fn(),
    } as unknown as jest.Mocked<MinigamesService>;

    controller = new TeacherMinigamesController(service);
  });

  it('listLevels delegates to the service with the given conceptId', async () => {
    const levels = [{ id: 'l1' }] as any;
    service.findByConceptId.mockResolvedValue(levels);

    const result = await controller.listLevels('fractions_equal_parts');

    expect(service.findByConceptId).toHaveBeenCalledWith('fractions_equal_parts');
    expect(result).toBe(levels);
  });

  it('updateLevel passes the authenticated teacher id, never trusting a body field for authorship', async () => {
    const updated = { id: 'l1', updatedByUserId: 'teacher-1' } as any;
    service.updateLevelConfig.mockResolvedValue(updated);
    const req = { user: { sub: 'teacher-1', pseudonymId: 'p1', role: Role.TEACHER } as JwtPayload };

    const result = await controller.updateLevel('l1', { theme: 'pizza' }, req);

    expect(service.updateLevelConfig).toHaveBeenCalledWith('l1', 'teacher-1', { theme: 'pizza' });
    expect(result).toBe(updated);
  });
});
