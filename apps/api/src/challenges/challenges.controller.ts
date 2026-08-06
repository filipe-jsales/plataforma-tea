import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BlockDefinition } from '../blocks/entities/block-definition.entity';
import { BlocksService } from '../blocks/blocks.service';
import { Role } from '../common/enums/role.enum';
import { isChallengeConfig, type SerializedBlockState } from './challenge-config.interface';
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
  // true = fase "use" (3.3): workspace pré-montado, travado, sem toolbox —
  // frontend nunca decide isso sozinho, só lê esta flag.
  locked: boolean;
  toolbox: { stage: string; categories: ToolboxCategory[] };
  goal: unknown;
  program: SerializedBlockState | null;
  investigationQuestion: string | null;
  // Próximo desafio da sequência Use-Modify-Create deste tópico (por
  // `position`), null se este for o último cadastrado até agora.
  nextChallengeId: string | null;
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
      locked: Boolean(challenge.config.program),
      toolbox: {
        stage: challenge.config.stage,
        categories: this.groupByCategory(blocks),
      },
      goal: challenge.config.goal,
      program: challenge.config.program ?? null,
      investigationQuestion: challenge.config.investigationQuestion ?? null,
      nextChallengeId: next?.id ?? null,
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
