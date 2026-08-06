import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlocksService } from './blocks.service';
import { BlockDefinition } from './entities/block-definition.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BlockDefinition])],
  providers: [BlocksService],
  exports: [BlocksService, TypeOrmModule],
})
export class BlocksModule {}
