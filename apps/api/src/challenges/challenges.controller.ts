import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BlockDefinition } from '../blocks/entities/block-definition.entity';
import { BlocksService } from '../blocks/blocks.service';
import { Role } from '../common/enums/role.enum';
import {
  isChallengeConfig,
  type ChallengeFeedbackMessages,
  type EditableFieldConfig,
  type SerializedBlockState,
} from './challenge-config.interface';
import { ChallengesService } from './challenges.service';
import { Challenge } from './entities/challenge.entity';

interface ToolboxCategory {
  slug: string;
  label: string;
  colour: number;
  blocks: Array<{ blockType: string; label: string; colour: number; json: Record<string, unknown> }>;
}

interface ChallengeDetail {
  id: string;
  title: string;
  prompt: string;
  // true só na fase "use" (3.3): workspace pré-montado, travado (Blockly
  // readOnly), sem toolbox — frontend nunca decide isso sozinho, só lê esta
  // flag. Não confundir com "tem programa pré-montado": a fase "modify"
  // também nasce com `program`, mas `locked: false` (campos editáveis) — ver
  // `stage` no toolbox pra frontend decidir toolbox/Ajuda/avaliação.
  locked: boolean;
  toolbox: { stage: string; categories: ToolboxCategory[] };
  goal: unknown;
  program: SerializedBlockState | null;
  investigationQuestion: string | null;
  // Motor PRIMM "Predict" (3.6) — pergunta exibida antes de cada execução.
  // Presente hoje só no desafio `modify`, mas resolvido genericamente a
  // partir de `config.predictQuestion` (nunca hardcoded por stage).
  predictQuestion: string | null;
  // Motor PRIMM "Modify" (3.4/3.6) — campos do `program` que o aluno pode
  // editar, com os limites min/max curados pra este desafio.
  editableFields: EditableFieldConfig[];
  // Próximo desafio da sequência Use-Modify-Create deste tópico (por
  // `position`), null se este for o último cadastrado até agora.
  nextChallengeId: string | null;
  // 4.2 — tolerância de encaixe escolhida pelo professor num desafio criado
  // via template; `null` usa o default do editor (ver
  // apps/web/src/lib/blocklyToolbox.ts#applyGenerousSnapTolerance).
  snapTolerancePercent: number | null;
  // 3.7 (AC4) — mensagens de feedback customizadas pelo professor; campos
  // ausentes/`null` usam o conjunto de mensagens-padrão sugeridas
  // (ChallengePage.tsx resolve o default, mesmo racional de
  // `snapTolerancePercent` acima).
  feedbackMessages: ChallengeFeedbackMessages | null;
}

// Aluno só — rota alimenta o editor de blocos do desafio já atribuído. Não
// existe autoria de toolbox pelo professor nesta versão (abstraído de
// propósito, ver "Blocos por desafio" em docs/ai/modules/backend.md): o
// conteúdo (blocks + Challenge.config) é curado via seed/migration, não uma
// tela visual de configuração.
@Controller('challenges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class ChallengesController {
  constructor(
    private readonly challengesService: ChallengesService,
    private readonly blocksService: BlocksService,
  ) {}

  // Entrada da sequência de um tópico (2.3 → aqui): sempre o desafio de
  // menor `position` — hoje "Desafio 1" (fase use).
  @Get('by-topic/:topicId')
  async getByTopic(@Param('topicId') topicId: string) {
    const challenge = await this.challengesService.findFirstByTopicId(topicId);
    if (!challenge) {
      throw new NotFoundException('Nenhum desafio cadastrado para este módulo ainda.');
    }
    return this.buildDetailOrThrow(challenge);
  }

  // Acesso direto a um desafio específico da sequência (ex.: "Avançar" saindo
  // do desafio anterior, via nextChallengeId).
  @Get(':id')
  async getById(@Param('id') id: string) {
    const challenge = await this.challengesService.findById(id);
    if (!challenge) {
      throw new NotFoundException('Desafio não encontrado.');
    }
    return this.buildDetailOrThrow(challenge);
  }

  private async buildDetailOrThrow(challenge: Challenge): Promise<ChallengeDetail> {
    if (!isChallengeConfig(challenge.config)) {
      // Desafio existe mas ainda não tem toolbox configurada (config vazio,
      // ver comentário em challenge.entity.ts) — não é um 404, é um estado
      // de conteúdo incompleto; melhor sinalizar isso do que devolver uma
      // paleta vazia silenciosamente.
      throw new NotFoundException('Este desafio ainda não tem blocos configurados.');
    }

    const [blocks, siblings] = await Promise.all([
      this.blocksService.findByTypes(challenge.config.allowedBlockTypes),
      this.challengesService.findByTopicIdOrdered(challenge.topicId),
    ]);
    const ownIndex = siblings.findIndex((sibling) => sibling.id === challenge.id);
    const next = ownIndex >= 0 ? siblings[ownIndex + 1] : undefined;

    return {
      id: challenge.id,
      title: challenge.title,
      prompt: challenge.prompt,
      // Explícito por `stage`, não por "tem programa" — a fase `modify`
      // também nasce com `program`, mas precisa do workspace editável (ver
      // comentário em ChallengeDetail acima).
      locked: challenge.config.stage === 'use',
      toolbox: {
        stage: challenge.config.stage,
        categories: this.groupByCategory(blocks),
      },
      goal: challenge.config.goal,
      program: challenge.config.program ?? null,
      investigationQuestion: challenge.config.investigationQuestion ?? null,
      predictQuestion: challenge.config.predictQuestion ?? null,
      editableFields: challenge.config.editableFields ?? [],
      nextChallengeId: next?.id ?? null,
      snapTolerancePercent: challenge.config.snapTolerancePercent ?? null,
      feedbackMessages: challenge.config.feedbackMessages ?? null,
    };
  }

  // AC5: abas/grupos pequenos e nomeados, nunca uma lista única — a
  // categoria vem do catálogo (blocks.category), não de código fixo aqui.
  private groupByCategory(blocks: BlockDefinition[]): ToolboxCategory[] {
    const categories = new Map<string, ToolboxCategory>();
    for (const block of blocks) {
      const existing = categories.get(block.category);
      const entry = {
        blockType: block.blockType,
        label: block.label,
        colour: block.colour,
        json: block.blocklyJson,
      };
      if (existing) {
        existing.blocks.push(entry);
      } else {
        categories.set(block.category, {
          slug: block.category,
          label: block.categoryLabel,
          colour: block.colour,
          blocks: [entry],
        });
      }
    }
    return Array.from(categories.values());
  }
}
