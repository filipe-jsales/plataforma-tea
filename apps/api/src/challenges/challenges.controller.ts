import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BlockDefinition } from '../blocks/entities/block-definition.entity';
import { BlocksService } from '../blocks/blocks.service';
import { Role } from '../common/enums/role.enum';
import { isChallengeConfig } from './challenge-config.interface';
import { ChallengesService } from './challenges.service';

interface ToolboxCategory {
  slug: string;
  label: string;
  colour: number;
  blocks: Array<{ blockType: string; label: string; colour: number; json: Record<string, unknown> }>;
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

  @Get('by-topic/:topicId')
  async getByTopic(@Param('topicId') topicId: string) {
    const challenge = await this.challengesService.findFirstByTopicId(topicId);
    if (!challenge) {
      throw new NotFoundException('Nenhum desafio cadastrado para este módulo ainda.');
    }
    if (!isChallengeConfig(challenge.config)) {
      // Desafio existe mas ainda não tem toolbox configurada (config vazio,
      // ver comentário em challenge.entity.ts) — não é um 404, é um estado
      // de conteúdo incompleto; melhor sinalizar isso do que devolver uma
      // paleta vazia silenciosamente.
      throw new NotFoundException('Este desafio ainda não tem blocos configurados.');
    }

    const blocks = await this.blocksService.findByTypes(challenge.config.allowedBlockTypes);
    return {
      id: challenge.id,
      title: challenge.title,
      prompt: challenge.prompt,
      toolbox: {
        stage: challenge.config.stage,
        categories: this.groupByCategory(blocks),
      },
      goal: challenge.config.goal,
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
