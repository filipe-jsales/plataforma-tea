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

  // Editor de blocos (3.x): MVP tem 1 desafio por tópico, então "o desafio
  // do tópico" é sempre o mais antigo — mesma lógica de findFirst(), apenas
  // escopada ao tópico escolhido no seletor (2.3). Ordenado por createdAt
  // porque um tópico com N desafios no futuro precisa da ordem cronológica
  // pra respeitar a progressão Use-Modify-Create (ver block-progression.ts).
  async findFirstByTopicId(topicId: string): Promise<Challenge | null> {
    const [first] = await this.challengesRepository.find({
      where: { topicId },
      order: { createdAt: 'ASC' },
      take: 1,
    });
    return first ?? null;
  }

  findById(id: string): Promise<Challenge | null> {
    return this.challengesRepository.findOne({ where: { id } });
  }
}
