import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeDraftsController } from './challenge-drafts.controller';
import { ChallengeDraftsService } from './challenge-drafts.service';
import { StudentChallengeDraft } from './entities/student-challenge-draft.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StudentChallengeDraft])],
  controllers: [ChallengeDraftsController],
  providers: [ChallengeDraftsService],
})
export class ChallengeDraftsModule {}
