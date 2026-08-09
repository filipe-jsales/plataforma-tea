import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlocksService } from '../blocks/blocks.service';
import type { ChallengeConfig, ChallengeFeedbackMessages } from '../challenges/challenge-config.interface';
import { isChallengeConfig } from '../challenges/challenge-config.interface';
import { ChallengesService } from '../challenges/challenges.service';
import { Challenge } from '../challenges/entities/challenge.entity';
import { sanitizeFeedbackMessages, validateFeedbackMessages } from '../challenges/feedback-messages';
import type { ChallengeTemplateHandler } from './handlers/challenge-template-handler.interface';
import type {
  ResolvedTemplateParameterDefinition,
  TemplateParameterDefinition,
} from './challenge-template-parameter.interface';
import { ChallengeTemplate } from './entities/challenge-template.entity';
import type { TemplateValidationError } from './handlers/challenge-template-handler.interface';
import { getTemplateHandler } from './handlers/template-registry';

export interface ChallengeTemplateSummary {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
}

export interface ChallengeTemplateDetail extends ChallengeTemplateSummary {
  parameterSchema: ResolvedTemplateParameterDefinition[];
}

export interface TemplatePreviewResult {
  valid: boolean;
  errors: TemplateValidationError[];
  goal: Record<string, unknown> | null;
}

export interface TeacherChallengeSummary {
  id: string;
  title: string;
  templateName: string;
  templateIcon: string;
  createdAt: Date;
}

export interface TeacherChallengeDetail {
  id: string;
  title: string;
  prompt: string;
  templateId: string;
  templateKey: string;
  params: Record<string, unknown>;
  // 3.7 (AC4) — mensagens que o professor customizou (vazio quando nunca
  // customizou, nunca omitido — o formulário de edição precisa distinguir
  // "sem valor" de "campo ausente" pra decidir o que pré-preencher).
  feedbackMessages: ChallengeFeedbackMessages;
}

export interface SaveTemplateChallengeInput {
  title: string;
  prompt?: string;
  params: Record<string, unknown>;
  // 3.7 (AC4) — opcional: quando ausente/vazio, o desafio usa o conjunto de
  // mensagens-padrão sugeridas (ver DEFAULT_FEEDBACK_MESSAGES).
  feedbackMessages?: ChallengeFeedbackMessages;
}

// 4.2 — Configuração de desafio via formulário guiado (Modo Template).
//
// ── Nota de pesquisa: por que dado+handler-por-key, não 100% dado ─────────
// `ChallengeTemplate` (a linha de catálogo — nome, ícone, descrição,
// `parameterSchema`) segue o mesmo padrão de `blocks`/`subjects` (tabela,
// não enum fixo — coding-rule.md). Mas VALIDAÇÃO pedagógica ("3 lados com
// 200° não fecha um polígono") e a TRADUÇÃO parâmetros→Challenge.config não
// podem ser 100% dado sem reinventar uma linguagem de regras genérica (o
// tipo de complexidade que este projeto evita — ver "Sem autoria de toolbox
// pelo professor" em docs/ai/modules/backend.md, mesma decisão de não
// construir um motor de regras visual). Por isso o desenho é: metadata
// (catálogo + schema de campos do formulário) é dado, cresce sem deploy;
// LÓGICA de validação/montagem é uma classe pequena por `key`
// (ChallengeTemplateHandler, ver handlers/) registrada em
// handlers/template-registry.ts. Cadastrar um template novo (geometria ou
// outra disciplina) é: 1 linha na tabela + 1 classe + 1 entrada no
// registry — nenhum destes três arquivos (service/controllers) muda. É o
// que torna a feature "reutilizável sem refazer do zero" pra cada novo
// desafio, conforme pedido explicitamente no card.
@Injectable()
export class ChallengeTemplatesService {
  constructor(
    @InjectRepository(ChallengeTemplate)
    private readonly templatesRepository: Repository<ChallengeTemplate>,
    private readonly challengesService: ChallengesService,
    private readonly blocksService: BlocksService,
  ) {}

  // AC1 — galeria: nome/ícone/descrição em linguagem simples, nunca o
  // blockType/estrutura Blockly do template.
  async listTemplates(): Promise<ChallengeTemplateSummary[]> {
    const templates = await this.templatesRepository.find({ order: { position: 'ASC' } });
    return templates.map((template) => this.toSummary(template));
  }

  // AC2 — formulário: cada parâmetro já resolvido (inclusive as opções de
  // `blockSelection`, filtradas pela regra Use-Modify-Create do tópico) pra
  // o frontend renderizar sem nenhuma lógica de negócio própria.
  async getTemplateDetail(id: string): Promise<ChallengeTemplateDetail> {
    const template = await this.findTemplateOrThrow(id);
    const introducedBlockTypes = await this.getIntroducedBlockTypes(template.topicId);
    const parameterSchema = await Promise.all(
      template.parameterSchema.map((param) => this.resolveParameter(param, introducedBlockTypes)),
    );
    return { ...this.toSummary(template), parameterSchema };
  }

  // AC3 (validação pedagógica, sempre 200 — `valid`/`errors` na resposta,
  // nunca um 400 genérico aqui) + AC4 ("Visualizar como aluno": `goal` é o
  // suficiente pro frontend animar o traçado-alvo no mesmo PixiTurtleWorld
  // que o botão de Ajuda do aluno já usa, sem expor blocos).
  async preview(templateId: string, params: Record<string, unknown>): Promise<TemplatePreviewResult> {
    const { template, handler } = await this.loadTemplateAndHandler(templateId);
    const context = { introducedBlockTypes: await this.getIntroducedBlockTypes(template.topicId) };
    const result = handler.validateParameters(params, context);
    if (!result.valid) {
      return { valid: false, errors: result.errors, goal: null };
    }
    return { valid: true, errors: [], goal: handler.buildPreviewGoal(params) };
  }

  async createChallenge(
    templateId: string,
    teacherId: string,
    input: SaveTemplateChallengeInput,
  ): Promise<TeacherChallengeSummary> {
    const { template, handler } = await this.loadTemplateAndHandler(templateId);
    const context = { introducedBlockTypes: await this.getIntroducedBlockTypes(template.topicId) };
    const config = this.validateAndBuildConfig(handler, input.params, input.feedbackMessages, context);
    const challenge = await this.challengesService.createFromTemplate({
      topicId: template.topicId,
      templateId: template.id,
      createdByUserId: teacherId,
      title: input.title,
      prompt: input.prompt?.trim() || this.buildDefaultPrompt(template, input.params),
      // `Challenge.config` é jsonb livre (Record<string, unknown> na
      // entidade) — ChallengeConfig é só a forma tipada em código de
      // aplicação (ver challenge-config.interface.ts), daí o cast.
      config: config as unknown as Record<string, unknown>,
      // RD-C — os parâmetros escolhidos pelo professor são persistidos no
      // próprio desafio, nunca descartados depois de virar `config` (RQ5:
      // rastreabilidade de qual configuração curricular foi usada).
      templateParams: input.params,
    });
    return this.toTeacherSummary(challenge, template);
  }

  // AC5 — "Meus desafios": só os criados via template por ESTE professor,
  // nunca o currículo semeado (ver ChallengesService.findByCreator).
  async listMine(teacherId: string): Promise<TeacherChallengeSummary[]> {
    const challenges = await this.challengesService.findByCreator(teacherId);
    return challenges.map((challenge) => this.toTeacherSummary(challenge, challenge.template));
  }

  // AC6 — abre no mesmo formulário guiado com os valores pré-preenchidos
  // (o frontend usa `templateKey` pra buscar o parameterSchema de novo e
  // `params` pra preencher o draft) — tanto pra editar quanto pra duplicar
  // (duplicar é o frontend chamando isto e depois `createChallenge` com um
  // novo título, nunca um endpoint de "clonar" que copiaria `config` bruto).
  async getMineOrThrow(id: string, teacherId: string): Promise<TeacherChallengeDetail> {
    const challenge = await this.findOwnedTemplateChallengeOrThrow(id, teacherId);
    return {
      id: challenge.id,
      title: challenge.title,
      prompt: challenge.prompt,
      templateId: challenge.templateId as string,
      templateKey: challenge.template?.key ?? '',
      params: challenge.templateParams ?? {},
      // 3.7 (AC4) — pré-preenche o formulário de edição com o que o
      // professor já customizou (nunca a partir de `Challenge.config`
      // bruto, ver isChallengeConfig — desafio sem config válido ainda
      // devolve {}, nunca quebra a tela).
      feedbackMessages: isChallengeConfig(challenge.config) ? (challenge.config.feedbackMessages ?? {}) : {},
    };
  }

  async updateMine(
    id: string,
    teacherId: string,
    input: SaveTemplateChallengeInput,
  ): Promise<TeacherChallengeSummary> {
    const challenge = await this.findOwnedTemplateChallengeOrThrow(id, teacherId);
    const { template, handler } = await this.loadTemplateAndHandler(challenge.templateId as string);
    const context = { introducedBlockTypes: await this.getIntroducedBlockTypes(template.topicId) };
    const config = this.validateAndBuildConfig(handler, input.params, input.feedbackMessages, context);
    const updated = await this.challengesService.updateFromTemplate(challenge, {
      title: input.title,
      prompt: input.prompt?.trim() || this.buildDefaultPrompt(template, input.params),
      config: config as unknown as Record<string, unknown>,
      templateParams: input.params,
    });
    return this.toTeacherSummary(updated, template);
  }

  async removeMine(id: string, teacherId: string): Promise<void> {
    const challenge = await this.findOwnedTemplateChallengeOrThrow(id, teacherId);
    await this.challengesService.remove(challenge);
  }

  private async findOwnedTemplateChallengeOrThrow(id: string, teacherId: string): Promise<Challenge> {
    const challenge = await this.challengesService.findByIdForOwner(id, teacherId);
    // `templateId` ausente aqui não deveria acontecer (findByCreator só
    // popula createdByUserId via createFromTemplate, que sempre grava
    // templateId junto) — checado mesmo assim como defesa em profundidade,
    // nunca deixar a tela do professor abrir um desafio sem template
    // associado num "editor bruto" por acidente.
    if (!challenge || !challenge.templateId) {
      throw new NotFoundException('Desafio não encontrado.');
    }
    return challenge;
  }

  // Combina a validação pedagógica do template (número de lados, ângulo...)
  // com a de 3.7 (AC1/AC4: mensagem de feedback customizada não pode usar
  // linguagem punitiva) num único bloqueio — o professor vê as duas classes
  // de erro juntas, nunca precisa salvar duas vezes pra descobrir a
  // segunda. Defesa em profundidade: a tela sempre chama preview() antes de
  // salvar (ver TeacherChallengeForm.tsx no frontend) para a validação do
  // handler, mas a de feedbackMessages só é checada aqui (não há um botão
  // de preview separado pra ela) — daí não poder pular esta chamada.
  private validateAndBuildConfig(
    handler: ChallengeTemplateHandler,
    params: Record<string, unknown>,
    feedbackMessages: ChallengeFeedbackMessages | undefined,
    context: { introducedBlockTypes: string[] },
  ): ChallengeConfig {
    const handlerResult = handler.validateParameters(params, context);
    const feedbackErrors = validateFeedbackMessages(feedbackMessages);
    const errors = [...handlerResult.errors, ...feedbackErrors];
    if (errors.length > 0) {
      // Mensagem continua pedagógica (as mesmas do handler/validador),
      // nunca "erro de validação"/"schema" genérico (regra não-negociável 9).
      throw new BadRequestException(errors.map((error) => error.message).join(' '));
    }

    const config = handler.buildChallengeConfig(params);
    const sanitized = sanitizeFeedbackMessages(feedbackMessages);
    if (sanitized) {
      config.feedbackMessages = sanitized;
    }
    return config;
  }

  private async loadTemplateAndHandler(templateId: string) {
    const template = await this.findTemplateOrThrow(templateId);
    const handler = getTemplateHandler(template.key);
    if (!handler) {
      // Linha de catálogo sem handler correspondente registrado — erro de
      // dado/deploy (template cadastrado sem o código do handler
      // acompanhar), nunca algo que o professor causou preenchendo o
      // formulário.
      throw new InternalServerErrorException('Este template está temporariamente indisponível.');
    }
    return { template, handler };
  }

  private async findTemplateOrThrow(id: string): Promise<ChallengeTemplate> {
    const template = await this.templatesRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template não encontrado.');
    }
    return template;
  }

  // Regra de progressão Use-Modify-Create (coding-rule.md) aplicada também
  // ao desafio criado via template: só oferece/aceita blocos que já
  // apareceram num desafio `stage: 'use'` deste MESMO tópico. Reaproveita
  // ChallengesService.findByTopicIdOrdered, que desde 4.2 já é escopado ao
  // currículo oficial (ver comentário no service) — sem query duplicada.
  private async getIntroducedBlockTypes(topicId: string): Promise<string[]> {
    const challenges = await this.challengesService.findByTopicIdOrdered(topicId);
    const introduced = new Set<string>();
    for (const challenge of challenges) {
      if (!isChallengeConfig(challenge.config) || challenge.config.stage !== 'use') continue;
      for (const blockType of challenge.config.allowedBlockTypes) {
        introduced.add(blockType);
      }
    }
    return Array.from(introduced);
  }

  private async resolveParameter(
    param: TemplateParameterDefinition,
    introducedBlockTypes: string[],
  ): Promise<ResolvedTemplateParameterDefinition> {
    if (param.type !== 'blockSelection') {
      return { ...param };
    }
    const candidates = (param.candidateBlockTypes ?? []).filter((blockType) =>
      introducedBlockTypes.includes(blockType),
    );
    const blocks = await this.blocksService.findByTypes(candidates);
    return {
      ...param,
      options: blocks.map((block) => ({ value: block.blockType, label: block.label })),
    };
  }

  private toSummary(template: ChallengeTemplate): ChallengeTemplateSummary {
    return {
      id: template.id,
      key: template.key,
      name: template.name,
      description: template.description,
      icon: template.icon,
    };
  }

  private toTeacherSummary(challenge: Challenge, template?: ChallengeTemplate | null): TeacherChallengeSummary {
    return {
      id: challenge.id,
      title: challenge.title,
      templateName: template?.name ?? '—',
      templateIcon: template?.icon ?? '🧩',
      createdAt: challenge.createdAt,
    };
  }

  // Enunciado default (o professor não é obrigado a escrever prosa pra
  // publicar um desafio) — hoje só sabe montar frase pro template
  // `regular_polygon`; um template futuro que precise de outro texto
  // sobrescreve isto lendo seus próprios parâmetros, nunca um formato único
  // hardcoded pra sempre.
  private buildDefaultPrompt(template: ChallengeTemplate, params: Record<string, unknown>): string {
    const sides = Number(params.sides);
    if (template.key === 'regular_polygon' && Number.isInteger(sides)) {
      return `Monte um desenho com ${sides} lados usando os blocos disponíveis.`;
    }
    return template.description;
  }
}
