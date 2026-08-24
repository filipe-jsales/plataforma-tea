import { MinigamesController } from './minigames.controller';
import { MinigamesService } from './minigames.service';

describe('MinigamesController', () => {
  let controller: MinigamesController;
  let service: jest.Mocked<MinigamesService>;

  beforeEach(() => {
    service = {
      findByConceptId: jest.fn(),
    } as unknown as jest.Mocked<MinigamesService>;

    controller = new MinigamesController(service);
  });

  it('listLevels delegates to the service with the given conceptId', async () => {
    const levels = [{ id: 'l1' }] as any;
    service.findByConceptId.mockResolvedValue(levels);

    const result = await controller.listLevels('fractions_equal_parts');

    expect(service.findByConceptId).toHaveBeenCalledWith('fractions_equal_parts');
    expect(result).toBe(levels);
  });
});
