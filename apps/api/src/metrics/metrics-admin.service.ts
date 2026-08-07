import { Injectable } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { SchoolsService } from '../schools/schools.service';

export interface SchoolOverview {
  id: string;
  name: string;
  classroomsCount: number;
  teachersCount: number;
  activeStudentsCount: number;
  activeStudentsToday: number;
}

export interface ClassroomOverview {
  id: string;
  name: string;
  // null quando a turma ainda não tem professor titular definido (AC de
  // 6.2) — frontend decide o texto de fallback, o backend nunca inventa uma
  // string tipo "sem professor".
  teacherDisplayName: string | null;
  activeStudentsCount: number;
}

// 6.2 — visão institucional do admin (escolas → turmas → professor
// responsável). Nunca nome de aluno aqui — é visão agregada; nível de
// aluno individual (mesmo pseudonimizado) é de outra tela (6.5).
@Injectable()
export class MetricsAdminService {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly eventsService: EventsService,
  ) {}

  async listSchoolsOverview(): Promise<SchoolOverview[]> {
    const schools = await this.schoolsService.findAllSchools();
    return Promise.all(schools.map((school) => this.buildSchoolOverview(school.id, school.name)));
  }

  private async buildSchoolOverview(schoolId: string, name: string): Promise<SchoolOverview> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [classrooms, teachersCount, activeStudents] = await Promise.all([
      this.schoolsService.findClassroomsBySchool(schoolId),
      this.schoolsService.countDistinctTeachersBySchool(schoolId),
      this.schoolsService.findActiveStudentsBySchool(schoolId),
    ]);
    const pseudoIds = activeStudents.map((enrollment) => enrollment.student.pseudonymId);
    const activeStudentsToday = await this.eventsService.countDistinctStudentsActiveSince(
      pseudoIds,
      startOfToday,
    );

    return {
      id: schoolId,
      name,
      // Turma sem nenhuma cadastrada devolve [] naturalmente (AC de 6.2:
      // "0 turmas", nunca erro) — nada de guard especial aqui.
      classroomsCount: classrooms.length,
      teachersCount,
      activeStudentsCount: pseudoIds.length,
      activeStudentsToday,
    };
  }

  async getSchoolClassrooms(schoolId: string): Promise<ClassroomOverview[]> {
    const classrooms = await this.schoolsService.findClassroomsBySchool(schoolId);
    return Promise.all(
      classrooms.map(async (classroom) => ({
        id: classroom.id,
        name: classroom.name,
        // AC de 6.2: turma sem professor titular não quebra a tela — só
        // devolve null, o teacher pode ser null no schema (ver
        // Classroom.teacherId).
        teacherDisplayName: classroom.teacher?.displayName ?? null,
        activeStudentsCount: await this.schoolsService.countActiveStudentsInClassroom(classroom.id),
      })),
    );
  }
}
