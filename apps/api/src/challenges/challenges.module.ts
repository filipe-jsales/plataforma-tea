import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengesService } from './challenges.service';
import { Challenge } from './entities/challenge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Challenge])],
  providers: [ChallengesService],
  exports: [ChallengesService, TypeOrmModule],
})
export class ChallengesModule {}
