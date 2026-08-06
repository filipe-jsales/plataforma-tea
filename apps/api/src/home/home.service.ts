import { Injectable } from '@nestjs/common';
import { ChallengesService } from '../challenges/challenges.service';
import { EventCategory } from '../common/enums/event-category.enum';
import { EventsService } from '../events/events.service';
import { SchoolsService } from '../schools/schools.service';
import { UsersService } from '../users/users.service';

export interface StudentHome {
  continueChallenge: { id: string; title: string } | null;
  progress: { completedChallengesCount: number };
}

export interface TeacherHomeClassroom {
  id: string;
  name: string;
  joinCode: string;
  activeStudentsToday: number;
}

export interface AdminHome {
  schoolsCount: number;
  classroomsCount: number;
  usersCount: number;
}

// Tipo de evento controlado (regra de coding-rule.md: "type" nunca é texto
// livre). Ainda não emitido por nenhuma feature (o motor de desafio/Blockly
// não existe neste MVP) — a contagem é honestamente 0 até lá.
const CHALLENGE_COMPLETED_EVENT_TYPE = 'challenge.completed';

@Injectable()
export class HomeService {
  constructor(
    private readonly challengesService: ChallengesService,
    private readonly eventsService: EventsService,
    private readonly schoolsService: SchoolsService,
    private readonly usersService: UsersService,
  ) {}

  // Regra não-negociável 5 / RQ4 ansiedade social: no máximo as duas ações
  // já definidas ("continuar" e "progresso"), nunca número comparativo a
  // outros alunos.
  async getStudentHome(studentPseudoId: string): Promise<StudentHome> {
    const [challenge, completedChallengesCount] = await Promise.all([
      this.challengesService.findFirst(),
      this.eventsService.countByStudentCategoryType(
        studentPseudoId,
        EventCategory.CURRICULAR,
        CHALLENGE_COMPLETED_EVENT_TYPE,
      ),
    ]);
    return {
      continueChallenge: challenge ? { id: challenge.id, title: challenge.title } : null,
      progress: { completedChallengesCount },
    };
  }

  // "3 alunos com atividade hoje" — nunca lista/ranking de quais alunos.
  async getTeacherHome(teacherId: string): Promise<TeacherHomeClassroom[]> {
    const classrooms = await this.schoolsService.findClassroomsByTeacher(teacherId);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return Promise.all(
      classrooms.map(async (classroom) => {
        const enrollments = await this.schoolsService.findActiveStudentsInClassroom(classroom.id);
        const pseudoIds = enrollments.map((enrollment) => enrollment.student.pseudonymId);
        const activeStudentsToday = await this.eventsService.countDistinctStudentsActiveSince(
          pseudoIds,
          startOfToday,
        );
        return {
          id: classroom.id,
          name: classroom.name,
          joinCode: classroom.joinCode,
          activeStudentsToday,
        };
      }),
    );
  }

  // Só contagens agregadas — nunca dado no nível de aluno individual nesta
  // tela (regra não-negociável 9 / critério de aceite de 2.1).
  async getAdminHome(): Promise<AdminHome> {
    const [schoolsCount, classroomsCount, usersCount] = await Promise.all([
      this.schoolsService.countSchools(),
      this.schoolsService.countClassrooms(),
      this.usersService.countAll(),
    ]);
    return { schoolsCount, classroomsCount, usersCount };
  }
}
