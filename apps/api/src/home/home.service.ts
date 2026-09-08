import { Injectable } from '@nestjs/common';
import { ChallengesService } from '../challenges/challenges.service';
import { EventCategory } from '../common/enums/event-category.enum';
import { EventsService } from '../events/events.service';
import { SchoolsService } from '../schools/schools.service';
import { UsersService } from '../users/users.service';
import { computeAmongMostActiveThisWeek, startOfCurrentWeek } from './class-comparison';

// 7.3 — só existe quando o professor ativou `Classroom.comparisonEnabled`
// (nasce OFF, regra não-negociável 5) E há ao menos 1 colega ativo pra
// comparar contra — `null` cobre os dois casos de "não mostrar nada" sem o
// frontend precisar adivinhar qual foi. Sempre agregado/anônimo:
// `amongMostActiveThisWeek` nunca vem acompanhado de nome/avatar/posição de
// outro aluno (AC de 7.3).
export interface StudentHome {
  continueChallenge: { id: string; title: string } | null;
  progress: { completedChallengesCount: number };
  classComparison: { amongMostActiveThisWeek: boolean } | null;
}

export interface TeacherHomeClassroom {
  id: string;
  name: string;
  joinCode: string;
  activeStudentsToday: number;
  // 4.3/7.3 — estado atual do toggle "comparação entre alunos" desta turma,
  // pra `TeacherMetrics` renderizar o controle sem uma 2ª chamada de rede.
  comparisonEnabled: boolean;
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
  // outros alunos — salvo `classComparison`, e mesmo essa é sempre agregada/
  // anônima e só existe com ativação explícita do professor (7.3).
  async getStudentHome(studentId: string, studentPseudoId: string): Promise<StudentHome> {
    const [challenge, completedChallengesCount, classComparison] = await Promise.all([
      this.challengesService.findFirst(),
      this.eventsService.countByStudentCategoryType(
        studentPseudoId,
        EventCategory.CURRICULAR,
        CHALLENGE_COMPLETED_EVENT_TYPE,
      ),
      this.computeClassComparison(studentId, studentPseudoId),
    ]);
    return {
      continueChallenge: challenge ? { id: challenge.id, title: challenge.title } : null,
      progress: { completedChallengesCount },
      classComparison,
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
          comparisonEnabled: classroom.comparisonEnabled,
        };
      }),
    );
  }

  // 7.3 — `null` quando: o professor nunca ativou a comparação pra esta
  // turma, o aluno não tem matrícula ativa, ou não há nenhum colega ativo
  // pra comparar contra (turma de 1 só) — os três casos renderizam "nada"
  // pro aluno, nunca um erro/estado quebrado.
  private async computeClassComparison(
    studentId: string,
    studentPseudoId: string,
  ): Promise<{ amongMostActiveThisWeek: boolean } | null> {
    const enrollment = await this.schoolsService.findSingleActiveEnrollment(studentId);
    if (!enrollment) {
      return null;
    }
    const classroom = await this.schoolsService.findClassroomById(enrollment.classroomId);
    if (!classroom || !classroom.comparisonEnabled) {
      return null;
    }

    const classmates = await this.schoolsService.findActiveStudentsInClassroom(classroom.id);
    const pseudoIds = classmates.map((classmate) => classmate.student.pseudonymId);
    if (pseudoIds.length < 2) {
      return null;
    }

    const since = startOfCurrentWeek(new Date());
    const activityByStudent = await this.eventsService.countEventsByStudentsSince(pseudoIds, since);
    const classroomActivityCounts = pseudoIds.map((id) => activityByStudent.get(id) ?? 0);
    const ownActivityCount = activityByStudent.get(studentPseudoId) ?? 0;

    return {
      amongMostActiveThisWeek: computeAmongMostActiveThisWeek(classroomActivityCounts, ownActivityCount),
    };
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
