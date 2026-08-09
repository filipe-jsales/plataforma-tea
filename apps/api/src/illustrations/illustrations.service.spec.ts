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

  describe('pickRandomAvatar', () => {
    it('throws when the avatar catalog is empty', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.pickRandomAvatar()).rejects.toThrow();
    });

    it('returns one of the catalog avatars', async () => {
      const avatars = [
        { id: 'a1' } as Illustration,
        { id: 'a2' } as Illustration,
      ];
      repository.find.mockResolvedValue(avatars);

      const result = await service.pickRandomAvatar();

      expect(avatars).toContainEqual(result);
    });
  });

  describe('pickRandomLoginImageSequence', () => {
    it('throws when the login-image pool has fewer than 3 illustrations', async () => {
      repository.find.mockResolvedValue([
        { id: 'i1' } as Illustration,
        { id: 'i2' } as Illustration,
      ]);

      await expect(service.pickRandomLoginImageSequence()).rejects.toThrow();
    });

    it('returns exactly 3 distinct illustrations from the pool', async () => {
      const pool = [
        { id: 'i1' } as Illustration,
        { id: 'i2' } as Illustration,
        { id: 'i3' } as Illustration,
        { id: 'i4' } as Illustration,
      ];
      repository.find.mockResolvedValue(pool);

      const result = await service.pickRandomLoginImageSequence();

      expect(result).toHaveLength(3);
      expect(new Set(result.map((i) => i.id)).size).toBe(3);
      result.forEach((illustration) =>
        expect(pool).toContainEqual(illustration),
      );
    });
  });
});
