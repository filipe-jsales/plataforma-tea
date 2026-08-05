import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Classroom } from './entities/classroom.entity';
import { Enrollment } from './entities/enrollment.entity';
import { School } from './entities/school.entity';
import { SchoolsService } from './schools.service';

@Module({
  imports: [TypeOrmModule.forFeature([School, Classroom, Enrollment])],
  providers: [SchoolsService],
  exports: [SchoolsService, TypeOrmModule],
})
export class SchoolsModule {}
