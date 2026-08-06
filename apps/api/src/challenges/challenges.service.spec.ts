import { Repository } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { ChallengesService } from './challenges.service';

describe('ChallengesService', () => {
  let service: ChallengesService;
  let repository: jest.Mocked<Repository<Challenge>>;

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Challenge>>;

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

  describe('findByTopicIdOrdered', () => {
    it('scopes by topicId and orders by position — never createdAt (ver challenge.entity.ts)', async () => {
      repository.find.mockResolvedValue([]);

      await service.findByTopicIdOrdered('topic-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { topicId: 'topic-1' },
        order: { position: 'ASC' },
      });
    });
  });

  describe('findFirstByTopicId', () => {
    it('returns null when the topic has no challenge yet', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findFirstByTopicId('topic-1')).resolves.toBeNull();
    });

    it('returns the first challenge in position order (Desafio 1 of the sequence)', async () => {
      const first = { id: 'c1', topicId: 'topic-1', position: 1 } as Challenge;
      const second = { id: 'c2', topicId: 'topic-1', position: 2 } as Challenge;
      repository.find.mockResolvedValue([first, second]);

      await expect(service.findFirstByTopicId('topic-1')).resolves.toBe(first);
    });
  });

  describe('findById', () => {
    it('looks up a single challenge by id', async () => {
      repository.findOne.mockResolvedValue(null);

      await service.findById('c1');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });
});
