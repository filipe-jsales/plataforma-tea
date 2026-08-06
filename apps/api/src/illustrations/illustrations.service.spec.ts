import { Repository } from 'typeorm';
import { IllustrationKind } from '../common/enums/illustration-kind.enum';
import { Illustration } from './entities/illustration.entity';
import { IllustrationsService } from './illustrations.service';

describe('IllustrationsService', () => {
  let service: IllustrationsService;
  let repository: jest.Mocked<Repository<Illustration>>;

  beforeEach(() => {
    repository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<Illustration>>;

    service = new IllustrationsService(repository);
  });

  it('findByKind filters by kind and orders by position ascending', async () => {
    repository.find.mockResolvedValue([]);

    await service.findByKind(IllustrationKind.AVATAR);

    expect(repository.find).toHaveBeenCalledWith({
      where: { kind: IllustrationKind.AVATAR },
      order: { position: 'ASC' },
    });
  });
});
