import { Repository } from 'typeorm';
import { BlockDefinition } from './entities/block-definition.entity';
import { BlocksService } from './blocks.service';

describe('BlocksService', () => {
  let service: BlocksService;
  let repository: jest.Mocked<Repository<BlockDefinition>>;

  beforeEach(() => {
    repository = { find: jest.fn() } as unknown as jest.Mocked<Repository<BlockDefinition>>;

    service = new BlocksService(repository);
  });

  it('findByTypes short-circuits to an empty list without querying when given no types', async () => {
    const result = await service.findByTypes([]);

    expect(result).toEqual([]);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('findByTypes filters by the given block types, ordered for stable category layout', async () => {
    repository.find.mockResolvedValue([]);

    await service.findByTypes(['move_forward', 'turn']);

    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { category: 'ASC', position: 'ASC' },
      }),
    );
  });
});
