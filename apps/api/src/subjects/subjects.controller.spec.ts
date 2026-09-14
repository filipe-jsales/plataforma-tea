import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { Topic } from './entities/topic.entity';

describe('SubjectsController', () => {
  let controller: SubjectsController;
  let subjectsService: jest.Mocked<SubjectsService>;

  beforeEach(() => {
    subjectsService = { findAllTopics: jest.fn() } as unknown as jest.Mocked<SubjectsService>;
    controller = new SubjectsController(subjectsService);
  });

  it('listTopics combines subject + topic name and passes through the routing domain', async () => {
    subjectsService.findAllTopics.mockResolvedValue([
      {
        id: 't1',
        subjectId: 's1',
        name: 'Ângulos e formas',
        domain: 'blocks_turtle',
        category: 'informatica_educacional',
        subject: { name: 'Geometria' },
      } as unknown as Topic,
      {
        id: 't2',
        subjectId: 's2',
        name: 'Estados da matéria',
        domain: 'water_state',
        category: 'informatica_educacional',
        subject: { name: 'Ciências' },
      } as unknown as Topic,
    ]);

    const result = await controller.listTopics();

    expect(result).toEqual([
      {
        topicId: 't1',
        subjectId: 's1',
        name: 'Geometria — Ângulos e formas',
        domain: 'blocks_turtle',
        category: 'informatica_educacional',
      },
      {
        topicId: 't2',
        subjectId: 's2',
        name: 'Ciências — Estados da matéria',
        domain: 'water_state',
        category: 'informatica_educacional',
      },
    ]);
  });
});
