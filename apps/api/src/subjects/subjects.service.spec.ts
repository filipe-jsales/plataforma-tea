import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { Topic } from './entities/topic.entity';
import { SubjectsService } from './subjects.service';

describe('SubjectsService', () => {
  let service: SubjectsService;
  let subjectsRepository: jest.Mocked<Repository<Subject>>;
  let topicsRepository: jest.Mocked<Repository<Topic>>;

  beforeEach(() => {
    subjectsRepository = { find: jest.fn() } as unknown as jest.Mocked<Repository<Subject>>;
    topicsRepository = { find: jest.fn(), findOne: jest.fn() } as unknown as jest.Mocked<Repository<Topic>>;

    service = new SubjectsService(subjectsRepository, topicsRepository);
  });

  it('findTopicsBySubjectSlug filters topics by the related subject slug', async () => {
    topicsRepository.find.mockResolvedValue([]);

    await service.findTopicsBySubjectSlug('logica');

    expect(topicsRepository.find).toHaveBeenCalledWith({
      where: { subject: { slug: 'logica' } },
      relations: { subject: true },
    });
  });

  it('findAllTopics includes the related subject on every topic', async () => {
    topicsRepository.find.mockResolvedValue([]);

    await service.findAllTopics();

    expect(topicsRepository.find).toHaveBeenCalledWith({ relations: { subject: true } });
  });

  it('findAllSubjects delegates directly to the repository', async () => {
    subjectsRepository.find.mockResolvedValue([]);

    await service.findAllSubjects();

    expect(subjectsRepository.find).toHaveBeenCalledWith();
  });

  describe('findTopicByConceptId (MJ8)', () => {
    it('queries the topic by conceptId', async () => {
      topicsRepository.findOne.mockResolvedValue(null);

      await service.findTopicByConceptId('fractions_equal_parts');

      expect(topicsRepository.findOne).toHaveBeenCalledWith({
        where: { conceptId: 'fractions_equal_parts' },
      });
    });

    it('returns null when no topic uses this conceptId yet (estado normal, não erro)', async () => {
      topicsRepository.findOne.mockResolvedValue(null);

      const result = await service.findTopicByConceptId('fractions_equal_parts');

      expect(result).toBeNull();
    });
  });
});
