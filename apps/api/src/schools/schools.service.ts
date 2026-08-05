import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Classroom } from './entities/classroom.entity';
import { Enrollment } from './entities/enrollment.entity';
import { School } from './entities/school.entity';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly schoolsRepository: Repository<School>,
    @InjectRepository(Classroom)
    private readonly classroomsRepository: Repository<Classroom>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,
  ) {}

  findClassroomsBySchool(schoolId: string): Promise<Classroom[]> {
    return this.classroomsRepository.find({ where: { schoolId } });
  }

  findActiveEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
    return this.enrollmentsRepository.find({
      where: { studentId, active: true },
      relations: { classroom: true },
    });
  }
}
