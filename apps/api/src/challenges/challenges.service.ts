import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Challenge } from './entities/challenge.entity';

export interface CreateTemplateChallengeInput {
  topicId: string;
  templateId: string;
  createdByUserId: string;
  title: string;
  prompt: string;
  config: Record<string, unknown>;
  templateParams: Record<string, unknown>;
}

export interface UpdateTemplateChallengeInput {
  title: string;
  prompt: string;
  config: Record<string, unknown>;
  templateParams: Record<string, unknown>;
}

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge)
    private readonly challengesRepository: Repository<Challenge>,
  ) {}

  findByTopicSlug(topicSlug: string): Promise<Challenge[]> {
    return this.challengesRepository.find({
      where: { topic: { slug: topicSlug } },
      relations: { topic: true },
    });
  }

  // MVP tem exatamente 1 desafio — "continuar desafio" na home do aluno
  // (2.1) sempre aponta pra ele. Quando houver progressão real por aluno,
  // isso vira "o desafio em andamento deste aluno", não o primeiro da tabela.
  async findFirst(): Promise<Challenge | null> {
    const [first] = await this.challengesRepository.find({ take: 1 });
    return first ?? null;
  }

  // Editor de blocos (3.x): a sequência Use-Modify-Create OFICIAL de um
  // tópico, ordenada por `position` (nunca `createdAt` — ver comentário em
  // challenge.entity.ts). `getByTopic` do controller pega o índice 0 daqui
  // (o "Desafio 1"); `nextChallengeId` é resolvido andando essa mesma lista.
  //
  // `createdByUserId IS NULL` escopa isto ao currículo curado via seed/
  // migration — desde 4.2, um desafio criado por um professor via template
  // (`createdByUserId` preenchido) NUNCA entra automaticamente nesta
  // sequência forçada. Não existe ainda mecanismo de "atribuir/publicar
  // desafio pra turma" (fora do escopo de 4.2, ver docs/ai/modules/
  // backend.md); até esse mecanismo existir, seria um risco real inserir
  // conteúdo não curado no fluxo obrigatório de TODOS os alunos do tópico só
  // porque um professor criou um desafio novo. Um desafio de professor
  // continua acessível por link direto (`GET /challenges/:id`, sem filtro),
  // só não participa da progressão automática nem do "Avançar".
  findByTopicIdOrdered(topicId: string): Promise<Challenge[]> {
    return this.challengesRepository.find({
      where: { topicId, createdByUserId: IsNull() },
      order: { position: 'ASC' },
    });
  }

  // 4.2 — maior `position` já usada no tópico, contando TODO desafio
  // (currículo + professor), pra um desafio novo criado via template nunca
  // colidir de posição com um já existente. Diferente de
  // findByTopicIdOrdered (que é escopado ao currículo oficial) de propósito.
  async findMaxPositionInTopic(topicId: string): Promise<number> {
    const [last] = await this.challengesRepository.find({
      where: { topicId },
      order: { position: 'DESC' },
      take: 1,
    });
    return last?.position ?? 0;
  }

  async findFirstByTopicId(topicId: string): Promise<Challenge | null> {
    const challenges = await this.findByTopicIdOrdered(topicId);
    return challenges[0] ?? null;
  }

  findById(id: string): Promise<Challenge | null> {
    return this.challengesRepository.findOne({ where: { id } });
  }

  // Seletor de desafio do relatório de profundidade (6.5) — todo desafio
  // cadastrado, com o tópico carregado (o admin escolhe "qual desafio" por
  // título + tópico, nunca por uuid). Ordenado por tópico e depois por
  // `position`, nunca `createdAt` (mesmo raciocínio de findByTopicIdOrdered).
  findAllWithTopic(): Promise<Challenge[]> {
    return this.challengesRepository.find({
      relations: { topic: true },
      order: { topicId: 'ASC', position: 'ASC' },
    });
  }

  // 4.2 — "Meus desafios" do professor: só os que ELE criou via template,
  // nunca o currículo semeado (que não pertence a nenhum professor). Mais
  // recente primeiro — é uma lista de trabalho do próprio professor, não
  // uma sequência pedagógica (não faz sentido ordenar por `position` aqui).
  findByCreator(createdByUserId: string): Promise<Challenge[]> {
    return this.challengesRepository.find({
      where: { createdByUserId },
      relations: { template: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Autorização "é dono deste desafio" — usada por toda tela de edição/
  // duplicação/exclusão do professor (AC5/AC6 de 4.2). `null` tanto pra
  // desafio inexistente quanto pra desafio de outro professor/do currículo —
  // o controller decide se isso vira 404 (nunca vaza "existe mas não é seu").
  findByIdForOwner(id: string, createdByUserId: string): Promise<Challenge | null> {
    return this.challengesRepository.findOne({
      where: { id, createdByUserId },
      relations: { template: true },
    });
  }

  async createFromTemplate(input: CreateTemplateChallengeInput): Promise<Challenge> {
    const position = (await this.findMaxPositionInTopic(input.topicId)) + 1;
    const challenge = this.challengesRepository.create({
      topicId: input.topicId,
      templateId: input.templateId,
      createdByUserId: input.createdByUserId,
      title: input.title,
      prompt: input.prompt,
      config: input.config,
      templateParams: input.templateParams,
      position,
    });
    return this.challengesRepository.save(challenge);
  }

  async updateFromTemplate(challenge: Challenge, input: UpdateTemplateChallengeInput): Promise<Challenge> {
    challenge.title = input.title;
    challenge.prompt = input.prompt;
    challenge.config = input.config;
    challenge.templateParams = input.templateParams;
    return this.challengesRepository.save(challenge);
  }

  async remove(challenge: Challenge): Promise<void> {
    await this.challengesRepository.remove(challenge);
  }
}
