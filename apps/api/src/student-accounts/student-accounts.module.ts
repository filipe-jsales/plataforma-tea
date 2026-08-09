import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { IllustrationsModule } from '../illustrations/illustrations.module';
import { SchoolsModule } from '../schools/schools.module';
import { UsersModule } from '../users/users.module';
import { StudentAccountsController } from './student-accounts.controller';
import { StudentAccountsService } from './student-accounts.service';

@Module({
  imports: [UsersModule, SchoolsModule, IllustrationsModule, EventsModule],
  controllers: [StudentAccountsController],
  providers: [StudentAccountsService],
})
export class StudentAccountsModule {}
