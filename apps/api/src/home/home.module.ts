import { Module } from '@nestjs/common';
import { ChallengesModule } from '../challenges/challenges.module';
import { EventsModule } from '../events/events.module';
import { SchoolsModule } from '../schools/schools.module';
import { UsersModule } from '../users/users.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  imports: [ChallengesModule, EventsModule, SchoolsModule, UsersModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
