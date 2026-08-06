import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge } from './entities/challenge.entity';

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

  // Editor de blocos (3.x): a sequência Use-Modify-Create de um tópico,
  // ordenada por `position` (nunca `createdAt` — ver comentário em
  // challenge.entity.ts). `getByTopic` do controller pega o índice 0 daqui
  // (o "Desafio 1"); `nextChallengeId` é resolvido andando essa mesma lista.
  findByTopicIdOrdered(topicId: string): Promise<Challenge[]> {
    return this.challengesRepository.find({
      where: { topicId },
      order: { position: 'ASC' },
    });
  }

  async findFirstByTopicId(topicId: string): Promise<Challenge | null> {
    const challenges = await this.findByTopicIdOrdered(topicId);
    return challenges[0] ?? null;
  }

  findById(id: string): Promise<Challenge | null> {
    return this.challengesRepository.findOne({ where: { id } });
  }
}
