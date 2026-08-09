import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { SchoolsModule } from '../schools/schools.module';
import { UsersModule } from '../users/users.module';
import {
  ClassroomRosterController,
  EnrollmentsController,
} from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

@Module({
  imports: [SchoolsModule, UsersModule, EventsModule],
  controllers: [EnrollmentsController, ClassroomRosterController],
  providers: [EnrollmentsService],
})
export class EnrollmentsModule {}
