import { IsNull, Repository } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { ChallengesService } from './challenges.service';

describe('ChallengesService', () => {
  let service: ChallengesService;
  let repository: jest.Mocked<Repository<Challenge>>;

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
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
    it('scopes by topicId, orders by position — never createdAt — and excludes teacher-authored challenges (4.2)', async () => {
      repository.find.mockResolvedValue([]);

      await service.findByTopicIdOrdered('topic-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { topicId: 'topic-1', createdByUserId: IsNull() },
        order: { position: 'ASC' },
      });
    });
  });

  describe('findMaxPositionInTopic', () => {
    it('returns 0 when the topic has no challenge yet', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findMaxPositionInTopic('topic-1')).resolves.toBe(0);
    });

    it('returns the highest position across ALL challenges of the topic, including teacher-authored ones', async () => {
      repository.find.mockResolvedValue([{ id: 'c1', position: 5 } as Challenge]);

      await expect(service.findMaxPositionInTopic('topic-1')).resolves.toBe(5);
      expect(repository.find).toHaveBeenCalledWith({
        where: { topicId: 'topic-1' },
        order: { position: 'DESC' },
        take: 1,
      });
    });
  });

  describe('findByCreator', () => {
    it('scopes to the given teacher and loads the template relation, most recent first', async () => {
      repository.find.mockResolvedValue([]);

      await service.findByCreator('teacher-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { createdByUserId: 'teacher-1' },
        relations: { template: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByIdForOwner', () => {
    it('never returns a challenge that belongs to a different teacher', async () => {
      repository.findOne.mockResolvedValue(null);

      await service.findByIdForOwner('c1', 'teacher-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'c1', createdByUserId: 'teacher-1' },
        relations: { template: true },
      });
    });
  });

  describe('createFromTemplate', () => {
    it('positions the new challenge right after the highest existing position in the topic', async () => {
      repository.find.mockResolvedValue([{ id: 'c1', position: 3 } as Challenge]);
      const created = { id: 'new' } as Challenge;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.createFromTemplate({
        topicId: 'topic-1',
        templateId: 'template-1',
        createdByUserId: 'teacher-1',
        title: 'Título',
        prompt: 'Enunciado',
        config: { stage: 'create' },
        templateParams: { sides: 4 },
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 4, templateId: 'template-1', createdByUserId: 'teacher-1' }),
      );
      expect(repository.save).toHaveBeenCalledWith(created);
    });
  });

  describe('remove', () => {
    it('delegates to the repository', async () => {
      const challenge = { id: 'c1' } as Challenge;

      await service.remove(challenge);

      expect(repository.remove).toHaveBeenCalledWith(challenge);
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

  describe('findAllWithTopic', () => {
    it('loads the topic relation, ordered by topic then position, never createdAt', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAllWithTopic();

      expect(repository.find).toHaveBeenCalledWith({
        relations: { topic: true },
        order: { topicId: 'ASC', position: 'ASC' },
      });
    });
  });
});
