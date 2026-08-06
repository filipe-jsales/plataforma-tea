import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BlockDefinition } from './entities/block-definition.entity';

@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(BlockDefinition)
    private readonly blocksRepository: Repository<BlockDefinition>,
  ) {}

  // Ordem por categoria + posição: a mesma ordem em que o professor viu o
  // bloco pela primeira vez continua estável entre desafios (previsibilidade
  // de layout, mesmo raciocínio de Illustration.position).
  findByTypes(blockTypes: string[]): Promise<BlockDefinition[]> {
    if (blockTypes.length === 0) {
      return Promise.resolve([]);
    }
    return this.blocksRepository.find({
      where: { blockType: In(blockTypes) },
      order: { category: 'ASC', position: 'ASC' },
    });
  }
}
