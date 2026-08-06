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
}
