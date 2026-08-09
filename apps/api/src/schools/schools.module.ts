import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Classroom } from './entities/classroom.entity';
import { Enrollment } from './entities/enrollment.entity';
import { School } from './entities/school.entity';
import { SchoolsAdminController } from './schools-admin.controller';
import { SchoolsAdminService } from './schools-admin.service';
import { SchoolsService } from './schools.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([School, Classroom, Enrollment]),
    UsersModule,
  ],
  controllers: [SchoolsAdminController],
  providers: [SchoolsService, SchoolsAdminService],
  exports: [SchoolsService, TypeOrmModule],
})
export class SchoolsModule {}
