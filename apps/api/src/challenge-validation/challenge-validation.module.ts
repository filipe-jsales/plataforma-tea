import { Module } from '@nestjs/common';
import { ChallengesModule } from '../challenges/challenges.module';
import { EventsModule } from '../events/events.module';
import { ChallengeValidationController } from './challenge-validation.controller';
import { ChallengeValidationService } from './challenge-validation.service';

@Module({
  imports: [ChallengesModule, EventsModule],
  controllers: [ChallengeValidationController],
  providers: [ChallengeValidationService],
})
export class ChallengeValidationModule {}
