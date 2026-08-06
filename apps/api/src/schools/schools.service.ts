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

  findClassroomByJoinCode(joinCode: string): Promise<Classroom | null> {
    return this.classroomsRepository.findOne({ where: { joinCode } });
  }

  // Roster de alunos ativos da turma — passo "seleção de avatar" do login.
  // Só devolve o suficiente para reconhecimento visual (avatar + nome de
  // exibição); nunca e-mail, pseudônimo ou qualquer dado de reversão.
  findActiveStudentsInClassroom(classroomId: string): Promise<Enrollment[]> {
    return this.enrollmentsRepository.find({
      where: { classroomId, active: true },
      relations: { student: { avatar: true } },
    });
  }

  findClassroomsByTeacher(teacherId: string): Promise<Classroom[]> {
    return this.classroomsRepository.find({ where: { teacherId } });
  }

  countSchools(): Promise<number> {
    return this.schoolsRepository.count();
  }

  countClassrooms(): Promise<number> {
    return this.classroomsRepository.count();
  }
}
