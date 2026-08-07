import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import './TeacherMetrics.css';

type ChallengeStage = 'use' | 'modify' | 'create';
type ChallengeStatus = 'not_started' | 'in_progress' | 'completed';
type SortKey = 'enrolledAt' | 'name';

interface TeacherClassroomOption {
  id: string;
  name: string;
  joinCode: string;
  activeStudentsToday: number;
}

interface StudentChallengeProgress {
  challengeId: string;
  title: string;
  stage: ChallengeStage;
  status: ChallengeStatus;
  attempts: number;
}

interface StudentProgressOverview {
  studentPseudoId: string;
  displayName: string;
  enrolledAt: string;
  challenges: StudentChallengeProgress[];
}

interface ClassroomStageBreakdown {
  stage: ChallengeStage;
  studentsCompleted: number;
  studentsInProgress: number;
  studentsNotStarted: number;
}

interface ClassroomSummary {
  totalStudents: number;
  activeStudentsToday: number;
  byStage: ClassroomStageBreakdown[];
  helpButtonUsageRate: number;
}

const STAGE_LABEL: Record<ChallengeStage, string> = {
  use: 'Observar (Use)',
  modify: 'Modificar (Modify)',
  create: 'Criar (Create)',
};

const STATUS_LABEL: Record<ChallengeStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
};

function sortStudents(students: StudentProgressOverview[], sortKey: SortKey): StudentProgressOverview[] {
  return [...students].sort((a, b) =>
    sortKey === 'name'
      ? a.displayName.localeCompare(b.displayName, 'pt-BR')
      : new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime(),
  );
}

// 6.3/6.4 — painel do professor: progresso por aluno da própria turma (6.3)
// e visão agregada (6.4), reaproveitando o motor 6.1. Área de staff, sem as
// restrições sensoriais do aluno (mesmo racional de AdminMetrics.css/
// StaffLogin.css — regra não-negociável 1 protege a experiência do aluno).
export function TeacherMetrics() {
  const [classrooms, setClassrooms] = useState<TeacherClassroomOption[] | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [view, setView] = useState<'students' | 'summary'>('students');
  const [students, setStudents] = useState<StudentProgressOverview[] | null>(null);
  const [summary, setSummary] = useState<ClassroomSummary | null>(null);
  // AC de 6.3: ordenação default nunca é por desempenho — só nome ou data de
  // matrícula, e a troca é sempre uma escolha explícita do professor.
  const [sortKey, setSortKey] = useState<SortKey>('enrolledAt');

  useEffect(() => {
    apiClient.get<TeacherClassroomOption[]>('/home/teacher').then(setClassrooms);
  }, []);

  useEffect(() => {
    if (!selectedClassroomId) {
      setStudents(null);
      setSummary(null);
      return;
    }
    setStudents(null);
    setSummary(null);
    apiClient
      .get<StudentProgressOverview[]>(`/metrics/teacher/classrooms/${selectedClassroomId}/students`)
      .then(setStudents);
    apiClient
      .get<ClassroomSummary>(`/metrics/teacher/classrooms/${selectedClassroomId}/summary`)
      .then(setSummary);
  }, [selectedClassroomId]);

  const selectedClassroom = classrooms?.find((classroom) => classroom.id === selectedClassroomId) ?? null;
  const sortedStudents = students ? sortStudents(students, sortKey) : null;
  const challengeColumns = sortedStudents?.[0]?.challenges ?? [];

  return (
    <main className="teacher-metrics">
      <Link to="/home" className="teacher-metrics__back-link">
        ← Voltar
      </Link>
      <h1>Painel da turma</h1>
      <p className="teacher-metrics__subtitle">
        Em que ponto cada aluno está na sequência Use → Modify → Create dos desafios disponíveis.
      </p>

      {classrooms === null && <p className="teacher-metrics__loading">Carregando turmas…</p>}

      {classrooms !== null && classrooms.length === 0 && (
        <p className="teacher-metrics__empty">Nenhuma turma atribuída a você ainda.</p>
      )}

      {classrooms !== null && classrooms.length > 0 && (
        <div className="teacher-metrics__classrooms">
          {classrooms.map((classroom) => (
            <button
              key={classroom.id}
              type="button"
              className={`teacher-metrics__classroom-card${
                classroom.id === selectedClassroomId ? ' teacher-metrics__classroom-card--selected' : ''
              }`}
              onClick={() =>
                setSelectedClassroomId(classroom.id === selectedClassroomId ? null : classroom.id)
              }
            >
              <span className="teacher-metrics__classroom-name">{classroom.name}</span>
              <span className="teacher-metrics__classroom-meta">Código: {classroom.joinCode}</span>
            </button>
          ))}
        </div>
      )}

      {selectedClassroom && (
        <section className="teacher-metrics__detail">
          <div className="teacher-metrics__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'students'}
              className={`teacher-metrics__tab${view === 'students' ? ' teacher-metrics__tab--active' : ''}`}
              onClick={() => setView('students')}
            >
              Por aluno
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'summary'}
              className={`teacher-metrics__tab${view === 'summary' ? ' teacher-metrics__tab--active' : ''}`}
              onClick={() => setView('summary')}
            >
              Turma toda
            </button>
          </div>

          {view === 'students' && (
            <div className="teacher-metrics__students-view">
              {students === null && <p className="teacher-metrics__loading">Carregando alunos…</p>}

              {students !== null && students.length === 0 && (
                <p className="teacher-metrics__empty">Nenhum aluno matriculado nesta turma ainda.</p>
              )}

              {students !== null && sortedStudents !== null && students.length > 0 && (
                <>
                  <label className="teacher-metrics__sort">
                    Ordenar por:{' '}
                    <select
                      value={sortKey}
                      onChange={(event) => setSortKey(event.target.value as SortKey)}
                    >
                      <option value="enrolledAt">Data de matrícula</option>
                      <option value="name">Nome</option>
                    </select>
                  </label>

                  <div className="teacher-metrics__table-wrap">
                    <table className="teacher-metrics__table">
                      <thead>
                        <tr>
                          <th>Aluno</th>
                          <th>Matrícula</th>
                          {challengeColumns.map((challenge) => (
                            <th key={challenge.challengeId}>
                              <span>{challenge.title}</span>
                              <span className="teacher-metrics__stage-tag">
                                {STAGE_LABEL[challenge.stage]}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudents.map((student) => (
                          <tr key={student.studentPseudoId}>
                            <td>{student.displayName}</td>
                            <td>{new Date(student.enrolledAt).toLocaleDateString('pt-BR')}</td>
                            {student.challenges.map((challenge) => (
                              <td key={challenge.challengeId}>
                                <span
                                  className={`teacher-metrics__status teacher-metrics__status--${challenge.status}`}
                                >
                                  {STATUS_LABEL[challenge.status]}
                                </span>
                                <span className="teacher-metrics__attempts">
                                  {challenge.attempts} tentativa{challenge.attempts === 1 ? '' : 's'}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {view === 'summary' && (
            <div className="teacher-metrics__summary-view">
              {summary === null && <p className="teacher-metrics__loading">Carregando turma…</p>}

              {summary !== null && summary.totalStudents === 0 && (
                <p className="teacher-metrics__empty">Nenhum aluno ativo nesta turma ainda.</p>
              )}

              {summary !== null && summary.totalStudents > 0 && (
                <>
                  <div className="teacher-metrics__summary-stats">
                    <SummaryStat value={summary.totalStudents} label="alunos matriculados" />
                    <SummaryStat value={summary.activeStudentsToday} label="ativos hoje" />
                    <SummaryStat
                      value={`${summary.helpButtonUsageRate}%`}
                      label="usaram o botão de Ajuda no Create"
                    />
                  </div>

                  <div className="teacher-metrics__bars">
                    {summary.byStage.map((stage) => (
                      <StageBar key={stage.stage} stage={stage} total={summary.totalStudents} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function SummaryStat({ value, label }: { value: number | string; label: string }) {
  return (
    <span className="teacher-metrics__summary-stat">
      <span className="teacher-metrics__summary-stat-value">{value}</span>
      <span className="teacher-metrics__summary-stat-label">{label}</span>
    </span>
  );
}

// AC de 6.4: pensada pra virar gráfico simples (barra de progresso por
// estágio), nunca uma tabela de números — largura estática por dado, sem
// nenhuma animação/transição decorativa.
function StageBar({ stage, total }: { stage: ClassroomStageBreakdown; total: number }) {
  const pct = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100));
  const summaryLabel = `${stage.studentsCompleted} concluído${
    stage.studentsCompleted === 1 ? '' : 's'
  }, ${stage.studentsInProgress} em andamento, ${stage.studentsNotStarted} não iniciado${
    stage.studentsNotStarted === 1 ? '' : 's'
  }`;

  return (
    <div className="teacher-metrics__bar-row">
      <span className="teacher-metrics__bar-label">{STAGE_LABEL[stage.stage]}</span>
      <div className="teacher-metrics__bar-track" role="img" aria-label={summaryLabel}>
        <span
          className="teacher-metrics__bar-segment teacher-metrics__bar-segment--completed"
          style={{ width: `${pct(stage.studentsCompleted)}%` }}
        />
        <span
          className="teacher-metrics__bar-segment teacher-metrics__bar-segment--in-progress"
          style={{ width: `${pct(stage.studentsInProgress)}%` }}
        />
        <span
          className="teacher-metrics__bar-segment teacher-metrics__bar-segment--not-started"
          style={{ width: `${pct(stage.studentsNotStarted)}%` }}
        />
      </div>
      <span className="teacher-metrics__bar-counts">{summaryLabel}</span>
    </div>
  );
}
