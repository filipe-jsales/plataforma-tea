import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IllustrationKind } from '../common/enums/illustration-kind.enum';
import { Illustration } from './entities/illustration.entity';

@Injectable()
export class IllustrationsService {
  constructor(
    @InjectRepository(Illustration)
    private readonly illustrationsRepository: Repository<Illustration>,
  ) {}

  findByKind(kind: IllustrationKind): Promise<Illustration[]> {
    return this.illustrationsRepository.find({
      where: { kind },
      order: { position: 'ASC' },
    });
  }
}
