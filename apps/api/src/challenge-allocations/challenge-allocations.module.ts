import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengesModule } from '../challenges/challenges.module';
import { ChallengeViewsModule } from '../challenge-views/challenge-views.module';
import { SchoolsModule } from '../schools/schools.module';
import { ChallengeAllocationsService } from './challenge-allocations.service';
import { ChallengeClassroomAllocation } from './entities/challenge-classroom-allocation.entity';
import { StudentClassroomChallengesController } from './student-classroom-challenges.controller';
import { TeacherChallengeAllocationsController } from './teacher-challenge-allocations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChallengeClassroomAllocation]),
    ChallengesModule,
    SchoolsModule,
    ChallengeViewsModule,
  ],
  controllers: [TeacherChallengeAllocationsController, StudentClassroomChallengesController],
  providers: [ChallengeAllocationsService],
})
export class ChallengeAllocationsModule {}
