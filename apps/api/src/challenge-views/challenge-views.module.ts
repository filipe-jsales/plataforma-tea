import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeViewsService } from './challenge-views.service';
import { StudentChallengeView } from './entities/student-challenge-view.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StudentChallengeView])],
  providers: [ChallengeViewsService],
  exports: [ChallengeViewsService],
})
export class ChallengeViewsModule {}
