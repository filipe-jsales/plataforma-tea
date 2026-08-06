import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlocksModule } from '../blocks/blocks.module';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { Challenge } from './entities/challenge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Challenge]), BlocksModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService, TypeOrmModule],
})
export class ChallengesModule {}
