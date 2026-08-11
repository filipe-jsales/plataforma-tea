import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BlockDefinition } from '../blocks/entities/block-definition.entity';
import { BlocksService } from '../blocks/blocks.service';
import { Challenge } from '../challenges/entities/challenge.entity';
import { ChallengesService } from '../challenges/challenges.service';
import { ChallengeTemplatesService } from './challenge-templates.service';
import { ChallengeTemplate } from './entities/challenge-template.entity';

describe('ChallengeTemplatesService', () => {
  let service: ChallengeTemplatesService;
  let templatesRepository: jest.Mocked<Repository<ChallengeTemplate>>;
  let challengesService: jest.Mocked<ChallengesService>;
  let blocksService: jest.Mocked<BlocksService>;

  const regularPolygonTemplate = {
    id: 'template-1',
    key: 'regular_polygon',
    name: 'Desenhar um polígono regular',
    description: 'O aluno monta um desenho com o número de lados escolhido por você.',
    icon: '🔷',
    topicId: 'topic-1',
    position: 1,
    parameterSchema: [
      {
        key: 'sides',
        label: 'Número de lados',
        icon: '🔺',
        type: 'integer',
        min: 3,
        max: 12,
        defaultValue: 4,
        visualPreview: 'polygonSides',
      },
      {
        key: 'enabledBlockTypes',
        label: 'Blocos disponíveis',
        icon: '🧩',
        type: 'blockSelection',
        defaultValue: ['move_forward', 'turn'],
        visualPreview: 'none',
        candidateBlockTypes: ['move_forward', 'turn', 'repeat_times'],
      },
    ],
  } as unknown as ChallengeTemplate;

  const useChallenge = {
    id: 'c1',
    topicId: 'topic-1',
    config: { stage: 'use', allowedBlockTypes: ['move_forward', 'turn', 'repeat_times'], goal: {} },
  } as unknown as Challenge;

  const validParams = {
    sides: 4,
    turnAngleDeg: 90,
    snapTolerancePercent: 60,
    closureTolerancePx: 5,
    enabledBlockTypes: ['move_forward', 'turn'],
    blockSize: 'medium',
  };

  beforeEach(() => {
    templatesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ChallengeTemplate>>;
    challengesService = {
      findByTopicIdOrdered: jest.fn().mockResolvedValue([useChallenge]),
      createFromTemplate: jest.fn(),
      findByCreator: jest.fn(),
      findByIdForOwner: jest.fn(),
      updateFromTemplate: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<ChallengesService>;
    blocksService = { findByTypes: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<BlocksService>;

    service = new ChallengeTemplatesService(templatesRepository, challengesService, blocksService);
  });

  describe('listTemplates', () => {
    it('never exposes anything beyond name/description/icon — no key/parameterSchema leaking to the gallery', async () => {
      templatesRepository.find.mockResolvedValue([regularPolygonTemplate]);

      const result = await service.listTemplates();

      expect(result).toEqual([
        {
          id: 'template-1',
          key: 'regular_polygon',
          name: 'Desenhar um polígono regular',
          description: 'O aluno monta um desenho com o número de lados escolhido por você.',
          icon: '🔷',
        },
      ]);
    });
  });

  describe('getTemplateDetail', () => {
    it('throws NotFoundException for an unknown template id', async () => {
      templatesRepository.findOne.mockResolvedValue(null);

      await expect(service.getTemplateDetail('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('passes non-blockSelection parameters through untouched', async () => {
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);

      const result = await service.getTemplateDetail('template-1');

      const sidesParam = result.parameterSchema.find((p) => p.key === 'sides');
      expect(sidesParam).toEqual(regularPolygonTemplate.parameterSchema[0]);
    });

    it('resolves blockSelection options filtered to blocks already introduced in a stage "use" challenge of the topic', async () => {
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);
      blocksService.findByTypes.mockResolvedValue([
        { blockType: 'move_forward', label: 'Mover para frente' } as BlockDefinition,
        { blockType: 'turn', label: 'Girar' } as BlockDefinition,
      ]);

      const result = await service.getTemplateDetail('template-1');

      // candidateBlockTypes inclui repeat_times, mas o único desafio 'use'
      // do fixture já introduz os 3 — o teste abaixo cobre o caso em que um
      // candidato NÃO foi introduzido ainda.
      expect(blocksService.findByTypes).toHaveBeenCalledWith(['move_forward', 'turn', 'repeat_times']);
      const blockParam = result.parameterSchema.find((p) => p.key === 'enabledBlockTypes');
      expect(blockParam?.options).toEqual([
        { value: 'move_forward', label: 'Mover para frente' },
        { value: 'turn', label: 'Girar' },
      ]);
    });

    it('excludes a candidate block that was never introduced in any stage "use" challenge (Use-Modify-Create rule)', async () => {
      challengesService.findByTopicIdOrdered.mockResolvedValue([
        {
          id: 'c1',
          topicId: 'topic-1',
          config: { stage: 'use', allowedBlockTypes: ['move_forward'], goal: {} },
        } as unknown as Challenge,
      ]);
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);

      await service.getTemplateDetail('template-1');

      expect(blocksService.findByTypes).toHaveBeenCalledWith(['move_forward']);
    });
  });

  describe('preview', () => {
    it('returns valid:false with pedagogical errors and no goal for an invalid combination', async () => {
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);

      const result = await service.preview('template-1', { ...validParams, sides: 3, turnAngleDeg: 200 });

      expect(result.valid).toBe(false);
      expect(result.goal).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('returns the numeric goal for "Visualizar como aluno" when parameters are valid', async () => {
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);

      const result = await service.preview('template-1', validParams);

      expect(result).toEqual({
        valid: true,
        errors: [],
        goal: { shape: 'regular_polygon', sides: 4, turnAngleDeg: 90 },
      });
    });
  });

  describe('createChallenge', () => {
    it('rejects invalid parameters with a friendly message and never calls ChallengesService.createFromTemplate', async () => {
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);

      await expect(
        service.createChallenge('template-1', 'teacher-1', {
          title: 'Triângulos e seus ângulos',
          params: { ...validParams, snapTolerancePercent: 0 },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(challengesService.createFromTemplate).not.toHaveBeenCalled();
    });

    it('persists the template params as curricular metadata (RD-C/RQ5) alongside the derived config', async () => {
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);
      challengesService.createFromTemplate.mockResolvedValue({
        id: 'challenge-1',
        title: 'Triângulos e seus ângulos',
        createdAt: new Date('2026-01-01'),
      } as Challenge);

      await service.createChallenge('template-1', 'teacher-1', {
        title: 'Triângulos e seus ângulos',
        params: validParams,
      });

      expect(challengesService.createFromTemplate).toHaveBeenCalledWith({
        topicId: 'topic-1',
        templateId: 'template-1',
        createdByUserId: 'teacher-1',
        title: 'Triângulos e seus ângulos',
        prompt: 'Monte um desenho com 4 lados usando os blocos disponíveis.',
        config: {
          stage: 'create',
          allowedBlockTypes: ['move_forward', 'turn'],
          goal: { shape: 'regular_polygon', sides: 4, turnAngleDeg: 90, closureTolerancePx: 5 },
          snapTolerancePercent: 60,
          blockScale: 1.3,
        },
        templateParams: validParams,
      });
    });

    it('3.7 (AC4) — merges valid custom feedback messages into the derived config', async () => {
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);
      challengesService.createFromTemplate.mockResolvedValue({ id: 'c1', createdAt: new Date() } as Challenge);

      await service.createChallenge('template-1', 'teacher-1', {
        title: 'Título',
        params: validParams,
        feedbackMessages: { retry: 'Esse ângulo ainda não fecha — quer ajustar?', success: '  ' },
      });

      expect(challengesService.createFromTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            feedbackMessages: { retry: 'Esse ângulo ainda não fecha — quer ajustar?' },
          }),
        }),
      );
    });

    it('3.7 (AC1) — rejects a custom feedback message with punitive language, never persisting it', async () => {
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);

      await expect(
        service.createChallenge('template-1', 'teacher-1', {
          title: 'Título',
          params: validParams,
          feedbackMessages: { retry: 'Isso está errado.' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(challengesService.createFromTemplate).not.toHaveBeenCalled();
    });

    it('omits feedbackMessages from config entirely when the professor never customizes it', async () => {
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);
      challengesService.createFromTemplate.mockResolvedValue({ id: 'c1', createdAt: new Date() } as Challenge);

      await service.createChallenge('template-1', 'teacher-1', { title: 'Título', params: validParams });

      const [[callArg]] = challengesService.createFromTemplate.mock.calls;
      expect(callArg.config).not.toHaveProperty('feedbackMessages');
    });

    it('uses the professor-provided prompt instead of the generated default when given', async () => {
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);
      challengesService.createFromTemplate.mockResolvedValue({ id: 'c1', createdAt: new Date() } as Challenge);

      await service.createChallenge('template-1', 'teacher-1', {
        title: 'Título',
        prompt: 'Desenhe um pentágono bem grande.',
        params: validParams,
      });

      expect(challengesService.createFromTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'Desenhe um pentágono bem grande.' }),
      );
    });
  });

  describe('teacher-owned challenge CRUD (AC5/AC6)', () => {
    it('getMineOrThrow throws NotFoundException for a challenge the teacher does not own', async () => {
      challengesService.findByIdForOwner.mockResolvedValue(null);

      await expect(service.getMineOrThrow('c1', 'teacher-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('getMineOrThrow returns the same form fields used at creation — never raw block structure', async () => {
      challengesService.findByIdForOwner.mockResolvedValue({
        id: 'c1',
        title: 'Título',
        prompt: 'Enunciado',
        templateId: 'template-1',
        template: regularPolygonTemplate,
        templateParams: validParams,
      } as unknown as Challenge);

      const result = await service.getMineOrThrow('c1', 'teacher-1');

      expect(result).toEqual({
        id: 'c1',
        title: 'Título',
        prompt: 'Enunciado',
        templateId: 'template-1',
        templateKey: 'regular_polygon',
        params: validParams,
        feedbackMessages: {},
      });
    });

    it('3.7 (AC4) — getMineOrThrow returns the customized feedback messages, for the edit form to pre-fill', async () => {
      challengesService.findByIdForOwner.mockResolvedValue({
        id: 'c1',
        title: 'Título',
        prompt: 'Enunciado',
        templateId: 'template-1',
        template: regularPolygonTemplate,
        templateParams: validParams,
        config: {
          stage: 'create',
          allowedBlockTypes: [],
          goal: {},
          feedbackMessages: { retry: 'Quer tentar de novo?' },
        },
      } as unknown as Challenge);

      const result = await service.getMineOrThrow('c1', 'teacher-1');

      expect(result.feedbackMessages).toEqual({ retry: 'Quer tentar de novo?' });
    });

    it('updateMine re-validates parameters and re-derives config, never trusting the stored config blindly', async () => {
      challengesService.findByIdForOwner.mockResolvedValue({
        id: 'c1',
        templateId: 'template-1',
      } as unknown as Challenge);
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);

      await expect(
        service.updateMine('c1', 'teacher-1', {
          title: 'Título',
          params: { ...validParams, sides: 3, turnAngleDeg: 200 },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(challengesService.updateFromTemplate).not.toHaveBeenCalled();
    });

    it('3.7 (AC4) — updateMine rejects a punitive custom feedback message, never calls updateFromTemplate', async () => {
      challengesService.findByIdForOwner.mockResolvedValue({
        id: 'c1',
        templateId: 'template-1',
      } as unknown as Challenge);
      templatesRepository.findOne.mockResolvedValue(regularPolygonTemplate);

      await expect(
        service.updateMine('c1', 'teacher-1', {
          title: 'Título',
          params: validParams,
          feedbackMessages: { success: 'Você falhou de novo.' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(challengesService.updateFromTemplate).not.toHaveBeenCalled();
    });

    it('removeMine deletes only after confirming ownership', async () => {
      const owned = { id: 'c1', templateId: 'template-1' } as unknown as Challenge;
      challengesService.findByIdForOwner.mockResolvedValue(owned);

      await service.removeMine('c1', 'teacher-1');

      expect(challengesService.remove).toHaveBeenCalledWith(owned);
    });
  });
});
