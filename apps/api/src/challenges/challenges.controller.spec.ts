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

  const modifyChallenge = {
    id: 'c2',
    topicId: 'topic-1',
    title: 'Monte o quadrado — agora mude!',
    prompt: 'Mude os números e veja a figura se transformar.',
    position: 2,
    config: {
      stage: 'modify',
      allowedBlockTypes: ['move_forward', 'turn', 'repeat_times'],
      goal: { shape: 'square', sides: 4, turnAngleDeg: 90 },
      program: { type: 'repeat_times', fields: { TIMES: 4 } },
      predictQuestion: 'Quantos lados você acha que a figura vai ter?',
      editableFields: [
        { blockType: 'repeat_times', fieldName: 'TIMES', label: 'Número de lados', min: 3, max: 8 },
        { blockType: 'turn', fieldName: 'ANGLE', label: 'Ângulo de giro (°)', min: 30, max: 150 },
      ],
    },
  } as unknown as Challenge;

  const createChallenge = {
    id: 'c3',
    topicId: 'topic-1',
    title: 'Monte o quadrado — sua vez!',
    prompt: 'Agora é com você.',
    position: 3,
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
      findByTopicIdOrdered: jest.fn().mockResolvedValue([useChallenge, modifyChallenge, createChallenge]),
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

    it('defaults predictQuestion to null and editableFields to [] when the desafio does not declare them', async () => {
      challengesService.findFirstByTopicId.mockResolvedValue(useChallenge);

      const result = await controller.getByTopic('topic-1');

      expect(result.predictQuestion).toBeNull();
      expect(result.editableFields).toEqual([]);
    });

    it('resolves nextChallengeId by walking the position-ordered sequence for the topic', async () => {
      challengesService.findFirstByTopicId.mockResolvedValue(useChallenge);

      const result = await controller.getByTopic('topic-1');

      expect(result.nextChallengeId).toBe('c2');
    });

    it('defaults snapTolerancePercent to null for curriculum-seeded challenges (4.2)', async () => {
      challengesService.findFirstByTopicId.mockResolvedValue(useChallenge);

      const result = await controller.getByTopic('topic-1');

      expect(result.snapTolerancePercent).toBeNull();
    });

    it('defaults blockScale to null for curriculum-seeded challenges', async () => {
      challengesService.findFirstByTopicId.mockResolvedValue(useChallenge);

      const result = await controller.getByTopic('topic-1');

      expect(result.blockScale).toBeNull();
    });

    it('3.7 (AC4) — defaults feedbackMessages to null for curriculum-seeded challenges', async () => {
      challengesService.findFirstByTopicId.mockResolvedValue(useChallenge);

      const result = await controller.getByTopic('topic-1');

      expect(result.feedbackMessages).toBeNull();
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when no challenge matches the id', async () => {
      challengesService.findById.mockResolvedValue(null);

      await expect(controller.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns an unlocked (free-build) challenge with no program, and no next after the last in the sequence', async () => {
      challengesService.findById.mockResolvedValue(createChallenge);

      const result = await controller.getById('c3');

      expect(result.locked).toBe(false);
      expect(result.program).toBeNull();
      expect(result.nextChallengeId).toBeNull();
    });

    it('returns a modify-stage challenge unlocked (fields editable) even though it has a pre-built program', async () => {
      challengesService.findById.mockResolvedValue(modifyChallenge);

      const result = await controller.getById('c2');

      expect(result.locked).toBe(false);
      expect(result.program).toEqual({ type: 'repeat_times', fields: { TIMES: 4 } });
      expect(result.predictQuestion).toBe('Quantos lados você acha que a figura vai ter?');
      expect(result.editableFields).toEqual([
        { blockType: 'repeat_times', fieldName: 'TIMES', label: 'Número de lados', min: 3, max: 8 },
        { blockType: 'turn', fieldName: 'ANGLE', label: 'Ângulo de giro (°)', min: 30, max: 150 },
      ]);
      expect(result.nextChallengeId).toBe('c3');
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

  it('4.2 — passes through the teacher-chosen snapTolerancePercent for a template-authored challenge', async () => {
    challengesService.findById.mockResolvedValue({
      ...createChallenge,
      config: { ...createChallenge.config, snapTolerancePercent: 60 },
    } as unknown as Challenge);

    const result = await controller.getById('c3');

    expect(result.snapTolerancePercent).toBe(60);
  });

  it('passes through the teacher-chosen blockScale for a template-authored challenge', async () => {
    challengesService.findById.mockResolvedValue({
      ...createChallenge,
      config: { ...createChallenge.config, blockScale: 1.3 },
    } as unknown as Challenge);

    const result = await controller.getById('c3');

    expect(result.blockScale).toBe(1.3);
  });

  it('3.7 (AC4) — passes through teacher-customized feedback messages for a template-authored challenge', async () => {
    challengesService.findById.mockResolvedValue({
      ...createChallenge,
      config: {
        ...createChallenge.config,
        feedbackMessages: { retry: 'Esse ângulo ainda não fecha — quer ajustar?' },
      },
    } as unknown as Challenge);

    const result = await controller.getById('c3');

    expect(result.feedbackMessages).toEqual({ retry: 'Esse ângulo ainda não fecha — quer ajustar?' });
  });

  it('7.4 (AC3) — passes through the teacher-chosen closureTolerancePx as part of goal', async () => {
    challengesService.findById.mockResolvedValue({
      ...createChallenge,
      config: {
        ...createChallenge.config,
        goal: { shape: 'regular_polygon', sides: 6, turnAngleDeg: 60, closureTolerancePx: 12 },
      },
    } as unknown as Challenge);

    const result = await controller.getById('c3');

    expect(result.goal).toEqual({ shape: 'regular_polygon', sides: 6, turnAngleDeg: 60, closureTolerancePx: 12 });
  });

  it('never leaks internal ids beyond what the toolbox needs — only blockType/label/colour/json', async () => {
    challengesService.findFirstByTopicId.mockResolvedValue(useChallenge);
    blocksService.findByTypes.mockResolvedValue([blockFixture({})]);

    const result = await controller.getByTopic('topic-1');

    const block = result.toolbox.categories[0].blocks[0];
    expect(Object.keys(block).sort()).toEqual(['blockType', 'colour', 'json', 'label']);
  });
});
