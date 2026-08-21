import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlocksModule } from '../blocks/blocks.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { EventsModule } from '../events/events.module';
import { ChallengeTemplatesController } from './challenge-templates.controller';
import { ChallengeTemplatesService } from './challenge-templates.service';
import { ChallengeTemplate } from './entities/challenge-template.entity';
import { TeacherChallengesController } from './teacher-challenges.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChallengeTemplate]), ChallengesModule, BlocksModule, EventsModule],
  controllers: [ChallengeTemplatesController, TeacherChallengesController],
  providers: [ChallengeTemplatesService],
})
export class ChallengeTemplatesModule {}
