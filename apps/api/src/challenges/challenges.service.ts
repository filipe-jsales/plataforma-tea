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
}
