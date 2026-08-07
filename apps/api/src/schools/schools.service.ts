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

  // `teacher` carregado de propósito (6.2): o painel institucional do admin
  // precisa do nome do professor responsável por cada turma — nenhum outro
  // chamador usa este método hoje, então carregar a relação sempre aqui não
  // quebra nada existente.
  findClassroomsBySchool(schoolId: string): Promise<Classroom[]> {
    return this.classroomsRepository.find({
      where: { schoolId },
      relations: { teacher: true },
    });
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

  // Painel do professor (6.3/6.4) — resolve a turma pra checar titularidade
  // (classroom.teacherId === professor autenticado) antes de qualquer query
  // de métrica. Sem relations: quem chama só precisa do teacherId.
  findClassroomById(id: string): Promise<Classroom | null> {
    return this.classroomsRepository.findOne({ where: { id } });
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

  // Painel institucional do admin (6.2) — lista completa de escolas
  // cadastradas, base pra montar a visão "uma linha por escola".
  findAllSchools(): Promise<School[]> {
    return this.schoolsRepository.find();
  }

  // Professores distintos com pelo menos 1 turma titular naquela escola —
  // `teacherId IS NOT NULL` porque uma turma pode existir sem professor
  // atribuído ainda (ver comentário em Classroom.teacherId).
  async countDistinctTeachersBySchool(schoolId: string): Promise<number> {
    const raw = await this.classroomsRepository
      .createQueryBuilder('classroom')
      .select('COUNT(DISTINCT classroom.teacherId)', 'count')
      .where('classroom.schoolId = :schoolId', { schoolId })
      .andWhere('classroom.teacherId IS NOT NULL')
      .getRawOne<{ count: string }>();
    return Number(raw?.count ?? 0);
  }

  // Matrículas ativas de qualquer turma da escola, com o aluno carregado —
  // dá tanto a contagem (`.length`) quanto os pseudônimos (pra
  // `EventsService.countDistinctStudentsActiveSince`) numa query só.
  findActiveStudentsBySchool(schoolId: string): Promise<Enrollment[]> {
    return this.enrollmentsRepository.find({
      where: { classroom: { schoolId }, active: true },
      relations: { student: true },
    });
  }

  // Alunos ativos de uma turma específica — contagem só, sem carregar
  // aluno/avatar (diferente de `findActiveStudentsInClassroom`, que existe
  // pro roster de login e precisa do aluno inteiro).
  countActiveStudentsInClassroom(classroomId: string): Promise<number> {
    return this.enrollmentsRepository.count({
      where: { classroomId, active: true },
    });
  }

  // 6.6 — valida que a escola do filtro de exportação existe antes de
  // resolver qualquer pseudônimo (404 claro em vez de simplesmente devolver
  // um export vazio pra um schoolId inválido/digitado errado).
  findSchoolById(id: string): Promise<School | null> {
    return this.schoolsRepository.findOne({ where: { id } });
  }

  // 6.6 — TODO aluno já matriculado na escola (qualquer turma, matrícula
  // ativa ou encerrada), não só os ativos — diferente de
  // `findActiveStudentsBySchool` (6.2, usado pra contagem "hoje"), a
  // exportação de pesquisa quer o histórico completo da escola: um aluno
  // que trocou de turma/saiu não deveria sumir dos dados exportáveis. Só
  // pseudônimo (nunca `displayName`) — é isto que
  // `MetricsAdminExportService`/`EventsService.findEventsForExport` usa pra
  // filtrar `interaction_events`, mantendo a pseudonimização mesmo no
  // export bruto (regra não-negociável 8).
  async findAllStudentPseudoIdsBySchool(schoolId: string): Promise<string[]> {
    const rows = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.classroom', 'classroom')
      .innerJoin('enrollment.student', 'student')
      .select('DISTINCT student.pseudonymId', 'pseudonymId')
      .where('classroom.schoolId = :schoolId', { schoolId })
      .getRawMany<{ pseudonymId: string }>();
    return rows.map((row) => row.pseudonymId);
  }
}
