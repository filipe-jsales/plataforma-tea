import { Repository } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { ChallengesService } from './challenges.service';

describe('ChallengesService', () => {
  let service: ChallengesService;
  let repository: jest.Mocked<Repository<Challenge>>;

  beforeEach(() => {
    repository = { find: jest.fn() } as unknown as jest.Mocked<Repository<Challenge>>;

    service = new ChallengesService(repository);
  });

  it('findByTopicSlug filters by the related topic slug', async () => {
    repository.find.mockResolvedValue([]);

    await service.findByTopicSlug('sequencia');

    expect(repository.find).toHaveBeenCalledWith({
      where: { topic: { slug: 'sequencia' } },
      relations: { topic: true },
    });
  });

  describe('findFirst', () => {
    it('returns null when no challenge exists yet', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findFirst()).resolves.toBeNull();
    });

    it('returns the single challenge fetched with take:1', async () => {
      const challenge = { id: 'c1', title: 'Desafio 1' } as Challenge;
      repository.find.mockResolvedValue([challenge]);

      await expect(service.findFirst()).resolves.toBe(challenge);
      expect(repository.find).toHaveBeenCalledWith({ take: 1 });
    });
  });
});
