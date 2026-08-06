import { NotFoundException } from '@nestjs/common';
import { BlocksService } from '../blocks/blocks.service';
import { BlockDefinition } from '../blocks/entities/block-definition.entity';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { Challenge } from './entities/challenge.entity';

describe('ChallengesController', () => {
  let controller: ChallengesController;
  let challengesService: jest.Mocked<ChallengesService>;
  let blocksService: jest.Mocked<BlocksService>;

  const blockFixture = (overrides: Partial<BlockDefinition>): BlockDefinition =>
    ({
      id: 'block-id',
      blockType: 'move_forward',
      label: 'mover para frente',
      category: 'movimento',
      categoryLabel: 'Movimento',
      colour: 200,
      position: 0,
      blocklyJson: { type: 'move_forward' },
      ...overrides,
    }) as BlockDefinition;

  beforeEach(() => {
    challengesService = {
      findFirstByTopicId: jest.fn(),
    } as unknown as jest.Mocked<ChallengesService>;
    blocksService = { findByTypes: jest.fn() } as unknown as jest.Mocked<BlocksService>;

    controller = new ChallengesController(challengesService, blocksService);
  });

  it('throws NotFoundException when the topic has no challenge yet', async () => {
    challengesService.findFirstByTopicId.mockResolvedValue(null);

    await expect(controller.getByTopic('topic-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the challenge exists but has no toolbox config yet', async () => {
    challengesService.findFirstByTopicId.mockResolvedValue({
      id: 'c1',
      config: {},
    } as Challenge);

    await expect(controller.getByTopic('topic-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(blocksService.findByTypes).not.toHaveBeenCalled();
  });

  it('groups blocks by category (AC5: abas pequenas, nunca uma lista única)', async () => {
    challengesService.findFirstByTopicId.mockResolvedValue({
      id: 'c1',
      title: 'Monte o quadrado',
      prompt: 'Encaixe os blocos para desenhar um quadrado.',
      config: {
        stage: 'use',
        allowedBlockTypes: ['move_forward', 'turn', 'repeat_times'],
        goal: { shape: 'square', sides: 4, turnAngleDeg: 90 },
      },
    } as Challenge);
    blocksService.findByTypes.mockResolvedValue([
      blockFixture({ blockType: 'move_forward', category: 'movimento', categoryLabel: 'Movimento' }),
      blockFixture({ blockType: 'turn', category: 'movimento', categoryLabel: 'Movimento' }),
      blockFixture({ blockType: 'repeat_times', category: 'controle', categoryLabel: 'Controle', colour: 290 }),
    ]);

    const result = await controller.getByTopic('topic-1');

    expect(blocksService.findByTypes).toHaveBeenCalledWith([
      'move_forward',
      'turn',
      'repeat_times',
    ]);
    expect(result.toolbox.stage).toBe('use');
    expect(result.toolbox.categories).toHaveLength(2);
    const movimento = result.toolbox.categories.find((c) => c.slug === 'movimento');
    expect(movimento?.blocks.map((b) => b.blockType)).toEqual(['move_forward', 'turn']);
    const controle = result.toolbox.categories.find((c) => c.slug === 'controle');
    expect(controle?.blocks.map((b) => b.blockType)).toEqual(['repeat_times']);
  });

  it('never leaks internal ids beyond what the toolbox needs — only blockType/label/colour/json', async () => {
    challengesService.findFirstByTopicId.mockResolvedValue({
      id: 'c1',
      title: 'Monte o quadrado',
      prompt: 'Encaixe os blocos.',
      config: {
        stage: 'use',
        allowedBlockTypes: ['move_forward'],
        goal: { shape: 'square', sides: 4, turnAngleDeg: 90 },
      },
    } as Challenge);
    blocksService.findByTypes.mockResolvedValue([blockFixture({})]);

    const result = await controller.getByTopic('topic-1');

    const block = result.toolbox.categories[0].blocks[0];
    expect(Object.keys(block).sort()).toEqual(['blockType', 'colour', 'json', 'label']);
  });
});
