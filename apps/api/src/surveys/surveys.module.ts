import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengesModule } from '../challenges/challenges.module';
import { SurveyResponse } from './entities/survey-response.entity';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyResponse]), ChallengesModule],
  controllers: [SurveysController],
  providers: [SurveysService],
})
export class SurveysModule {}
