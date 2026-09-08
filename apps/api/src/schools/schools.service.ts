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

  // 4.3/7.3 — liga/desliga a comparação agregada/anônima entre alunos.
  // `update` direto (não `findOne`+`save`), mesmo racional de
  // `setClassroomActive`: é só este único campo, sem outro estado derivado
  // pra recalcular.
  async setClassroomComparisonEnabled(
    id: string,
    enabled: boolean,
  ): Promise<Classroom | null> {
    await this.classroomsRepository.update(id, { comparisonEnabled: enabled });
    return this.findClassroomById(id);
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
      // B1 — `classroom` agora tem `deletedAt` (soft delete de turma); um
      // INNER JOIN pra uma entidade soft-deletable ganha automaticamente
      // `classroom.deletedAt IS NULL` no join, a menos que `.withDeleted()`
      // seja chamado. Este método precisa do oposto: é export de pesquisa,
      // quer TODO aluno já matriculado na escola (mesmo racional que já o
      // fazia incluir matrícula encerrada) — arquivar uma turma não pode
      // apagar o histórico dela do dado exportável.
      .withDeleted()
      .select('DISTINCT student.pseudonymId', 'pseudonymId')
      .where('classroom.schoolId = :schoolId', { schoolId })
      .getRawMany<{ pseudonymId: string }>();
    return rows.map((row) => row.pseudonymId);
  }

  // 1.2 — "tentativa de cadastro duplicado (mesmo nome + mesma turma) gera
  // alerta não bloqueante". Comparação case/trim-insensitive: "João" e
  // " joão " não deveriam escapar do alerta por diferença de digitação.
  async hasActiveStudentWithNameInClassroom(
    classroomId: string,
    displayName: string,
  ): Promise<boolean> {
    const normalized = displayName.trim().toLowerCase();
    const count = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.student', 'student')
      .where('enrollment.classroomId = :classroomId', { classroomId })
      .andWhere('enrollment.active = true')
      .andWhere('LOWER(TRIM(student.displayName)) = :normalized', {
        normalized,
      })
      .getCount();
    return count > 0;
  }

  // 1.2/1.5 — grava a matrícula (AC de 1.5: "o vínculo é registrado com
  // data de início" — `enrolledAt` é `@CreateDateColumn`, sem input
  // manual).
  createEnrollment(
    studentId: string,
    classroomId: string,
  ): Promise<Enrollment> {
    const enrollment = this.enrollmentsRepository.create({
      studentId,
      classroomId,
      active: true,
    });
    return this.enrollmentsRepository.save(enrollment);
  }

  // 1.5 — "ao mover um aluno, o vínculo anterior é encerrado (data de
  // fim)". Nunca sobrescrito/apagado — só marcado inativo, mesma filosofia
  // de histórico do resto do módulo.
  async endEnrollment(enrollment: Enrollment): Promise<Enrollment> {
    enrollment.active = false;
    enrollment.unenrolledAt = new Date();
    return this.enrollmentsRepository.save(enrollment);
  }

  // 1.5 — "um aluno não pode estar em duas turmas ativas simultaneamente
  // no MVP": única matrícula ativa do aluno (schema já é N:N-capaz, ver
  // Enrollment — esta é a leitura que impõe a regra de produto do MVP, não
  // uma limitação do banco). `null` quando o aluno nunca foi matriculado.
  async findSingleActiveEnrollment(
    studentId: string,
  ): Promise<Enrollment | null> {
    return this.enrollmentsRepository.findOne({
      where: { studentId, active: true },
    });
  }

  // 1.2/1.5 (telas de admin) — turmas de uma escola específica, sem a
  // relação `teacher` (diferente de `findClassroomsBySchool`, usada pelo
  // painel institucional de 6.2) — só o suficiente pro seletor "turma" do
  // formulário.
  findClassroomsBySchoolForSelector(schoolId: string): Promise<Classroom[]> {
    return this.classroomsRepository.find({
      where: { schoolId },
      order: { name: 'ASC' },
    });
  }

  // --- CRUD administrativo (escolas/turmas) ---

  // AC: "sem campos obrigatórios que exijam conhecimento técnico" — só
  // `name` é obrigatório, `externalId` (código INEP etc.) é opcional.
  createSchool(data: {
    name: string;
    externalId: string | null;
  }): Promise<School> {
    const school = this.schoolsRepository.create({
      name: data.name,
      externalId: data.externalId,
    });
    return this.schoolsRepository.save(school);
  }

  // `withDeleted: true` de propósito — editar uma escola desativada (ex.:
  // corrigir o nome antes de reativar) não deveria exigir reativar primeiro.
  async findSchoolByIdIncludingInactive(id: string): Promise<School | null> {
    return this.schoolsRepository.findOne({
      where: { id },
      withDeleted: true,
    });
  }

  async updateSchool(
    id: string,
    data: { name?: string; externalId?: string | null },
  ): Promise<School | null> {
    const school = await this.findSchoolByIdIncludingInactive(id);
    if (!school) {
      return null;
    }
    if (data.name !== undefined) {
      school.name = data.name;
    }
    if (data.externalId !== undefined) {
      school.externalId = data.externalId;
    }
    return this.schoolsRepository.save(school);
  }

  // B1 — soft delete, nunca hard delete: `active=false` grava `deletedAt`/
  // `deletedByUserId` (some das listagens padrão, mas turmas/matrículas
  // vinculadas continuam intactas — cascata de arquivamento pra turma é uma
  // ação separada, não implícita); `active=true` limpa os dois campos
  // (restaura). `repository.update` (não `findOne`+`save`) de propósito: é
  // uma query UPDATE direta, não filtrada por `deletedAt IS NULL` (esse
  // filtro automático só se aplica a SELECT) — necessário pra conseguir
  // reativar uma escola já desativada.
  async setSchoolActive(
    id: string,
    active: boolean,
    actorUserId: string,
  ): Promise<School | null> {
    await this.schoolsRepository.update(id, {
      deletedAt: active ? null : new Date(),
      deletedByUserId: active ? null : actorUserId,
    });
    return this.findSchoolByIdIncludingInactive(id);
  }

  // Lista completa pra tela de admin — inclui desativadas de propósito
  // (`withDeleted: true`), diferente de `findAllSchools` (6.2, painel
  // institucional, que só quer escola ativa). O front decide o que mostrar
  // por padrão via o campo `active` já computado na resposta do controller.
  findAllSchoolsIncludingInactive(): Promise<School[]> {
    return this.schoolsRepository.find({
      withDeleted: true,
      order: { name: 'ASC' },
    });
  }

  createClassroom(data: {
    schoolId: string;
    name: string;
    teacherId: string | null;
  }): Promise<Classroom> {
    const classroom = this.classroomsRepository.create({
      schoolId: data.schoolId,
      name: data.name,
      teacherId: data.teacherId,
    });
    return this.classroomsRepository.save(classroom);
  }

  async findClassroomByIdIncludingInactive(
    id: string,
  ): Promise<Classroom | null> {
    return this.classroomsRepository.findOne({
      where: { id },
      withDeleted: true,
    });
  }

  async updateClassroom(
    id: string,
    data: { name?: string; teacherId?: string | null },
  ): Promise<Classroom | null> {
    const classroom = await this.findClassroomByIdIncludingInactive(id);
    if (!classroom) {
      return null;
    }
    if (data.name !== undefined) {
      classroom.name = data.name;
    }
    if (data.teacherId !== undefined) {
      classroom.teacherId = data.teacherId;
    }
    return this.classroomsRepository.save(classroom);
  }

  // Mesmo racional de setSchoolActive — soft delete via update direto, sem
  // filtro implícito de deletedAt, pra permitir reativar.
  async setClassroomActive(
    id: string,
    active: boolean,
    actorUserId: string,
  ): Promise<Classroom | null> {
    await this.classroomsRepository.update(id, {
      deletedAt: active ? null : new Date(),
      deletedByUserId: active ? null : actorUserId,
    });
    return this.findClassroomByIdIncludingInactive(id);
  }

  // Tela de admin de uma escola específica — inclui turmas desativadas
  // (mesmo racional de findAllSchoolsIncludingInactive), com o professor
  // titular carregado (a tela precisa mostrar o nome, mesmo padrão de
  // findClassroomsBySchool).
  findClassroomsBySchoolIncludingInactive(
    schoolId: string,
  ): Promise<Classroom[]> {
    return this.classroomsRepository.find({
      where: { schoolId },
      relations: { teacher: true },
      withDeleted: true,
      order: { name: 'ASC' },
    });
  }
}
