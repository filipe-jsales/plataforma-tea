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

  const useChallenge = {
    id: 'c1',
    topicId: 'topic-1',
    title: 'Monte o quadrado',
    prompt: 'Encaixe os blocos para desenhar um quadrado.',
    position: 1,
    config: {
      stage: 'use',
      allowedBlockTypes: ['move_forward', 'turn', 'repeat_times'],
      goal: { shape: 'square', sides: 4, turnAngleDeg: 90 },
      program: { type: 'repeat_times', fields: { TIMES: 4 } },
      investigationQuestion: 'Quantas vezes o personagem virou?',
    },
  } as unknown as Challenge;

  const createChallenge = {
    id: 'c2',
    topicId: 'topic-1',
    title: 'Monte o quadrado — sua vez!',
    prompt: 'Agora é com você.',
    position: 2,
    config: {
      stage: 'create',
      allowedBlockTypes: ['move_forward', 'turn', 'repeat_times'],
      goal: { shape: 'square', sides: 4, turnAngleDeg: 90 },
    },
  } as unknown as Challenge;

  beforeEach(() => {
    challengesService = {
      findFirstByTopicId: jest.fn(),
      findById: jest.fn(),
      findByTopicIdOrdered: jest.fn().mockResolvedValue([useChallenge, createChallenge]),
    } as unknown as jest.Mocked<ChallengesService>;
    blocksService = { findByTypes: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<BlocksService>;

    controller = new ChallengesController(challengesService, blocksService);
  });

  describe('getByTopic', () => {
    it('throws NotFoundException when the topic has no challenge yet', async () => {
      challengesService.findFirstByTopicId.mockResolvedValue(null);

      await expect(controller.getByTopic('topic-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the challenge exists but has no toolbox config yet', async () => {
      challengesService.findFirstByTopicId.mockResolvedValue({ id: 'c1', config: {} } as Challenge);

      await expect(controller.getByTopic('topic-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(blocksService.findByTypes).not.toHaveBeenCalled();
    });

    it('returns the entry (position 1) challenge of the sequence, locked, with its program and question', async () => {
      challengesService.findFirstByTopicId.mockResolvedValue(useChallenge);

      const result = await controller.getByTopic('topic-1');

      expect(result.id).toBe('c1');
      expect(result.locked).toBe(true);
      expect(result.program).toEqual({ type: 'repeat_times', fields: { TIMES: 4 } });
      expect(result.investigationQuestion).toBe('Quantas vezes o personagem virou?');
    });

    it('resolves nextChallengeId by walking the position-ordered sequence for the topic', async () => {
      challengesService.findFirstByTopicId.mockResolvedValue(useChallenge);

      const result = await controller.getByTopic('topic-1');

      expect(result.nextChallengeId).toBe('c2');
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when no challenge matches the id', async () => {
      challengesService.findById.mockResolvedValue(null);

      await expect(controller.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns an unlocked (free-build) challenge with no program, and no next after the last in the sequence', async () => {
      challengesService.findById.mockResolvedValue(createChallenge);

      const result = await controller.getById('c2');

      expect(result.locked).toBe(false);
      expect(result.program).toBeNull();
      expect(result.nextChallengeId).toBeNull();
    });
  });

  it('groups blocks by category (AC5: abas pequenas, nunca uma lista única)', async () => {
    challengesService.findFirstByTopicId.mockResolvedValue(useChallenge);
    blocksService.findByTypes.mockResolvedValue([
      blockFixture({ blockType: 'move_forward', category: 'movimento', categoryLabel: 'Movimento' }),
      blockFixture({ blockType: 'turn', category: 'movimento', categoryLabel: 'Movimento' }),
      blockFixture({ blockType: 'repeat_times', category: 'controle', categoryLabel: 'Controle', colour: 290 }),
    ]);

    const result = await controller.getByTopic('topic-1');

    expect(blocksService.findByTypes).toHaveBeenCalledWith(['move_forward', 'turn', 'repeat_times']);
    expect(result.toolbox.stage).toBe('use');
    expect(result.toolbox.categories).toHaveLength(2);
    const movimento = result.toolbox.categories.find((c) => c.slug === 'movimento');
    expect(movimento?.blocks.map((b) => b.blockType)).toEqual(['move_forward', 'turn']);
    const controle = result.toolbox.categories.find((c) => c.slug === 'controle');
    expect(controle?.blocks.map((b) => b.blockType)).toEqual(['repeat_times']);
  });

  it('never leaks internal ids beyond what the toolbox needs — only blockType/label/colour/json', async () => {
    challengesService.findFirstByTopicId.mockResolvedValue(useChallenge);
    blocksService.findByTypes.mockResolvedValue([blockFixture({})]);

    const result = await controller.getByTopic('topic-1');

    const block = result.toolbox.categories[0].blocks[0];
    expect(Object.keys(block).sort()).toEqual(['blockType', 'colour', 'json', 'label']);
  });
});
