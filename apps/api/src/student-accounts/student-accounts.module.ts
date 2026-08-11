import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { GuardianConsentsModule } from '../guardian-consents/guardian-consents.module';
import { IllustrationsModule } from '../illustrations/illustrations.module';
import { SchoolsModule } from '../schools/schools.module';
import { UsersModule } from '../users/users.module';
import { StudentAccountsController } from './student-accounts.controller';
import { StudentAccountsService } from './student-accounts.service';

@Module({
  imports: [
    UsersModule,
    SchoolsModule,
    IllustrationsModule,
    EventsModule,
    GuardianConsentsModule,
  ],
  controllers: [StudentAccountsController],
  providers: [StudentAccountsService],
})
export class StudentAccountsModule {}
