import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import {
  Badge,
  LinkButton,
  Select,
  SegmentedControl,
  SelectableCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type BadgeVariant,
} from '../../components/ui';
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

// 3.11 — "Concluído" continua verde, "Em andamento" continua o mesmo
// amarelo de aviso (não-punitivo: cor expressiva no feedback positivo,
// nunca no negativo) — só o COMPONENTE (Badge) muda, a semântica de cor é a
// mesma de antes desta feature.
const STATUS_VARIANT: Record<ChallengeStatus, BadgeVariant> = {
  not_started: 'neutral',
  in_progress: 'warning',
  completed: 'success',
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'enrolledAt', label: 'Data de matrícula' },
  { value: 'name', label: 'Nome' },
];

const VIEW_OPTIONS = [
  { value: 'students', label: 'Por aluno' },
  { value: 'summary', label: 'Turma toda' },
];

function sortStudents(students: StudentProgressOverview[], sortKey: SortKey): StudentProgressOverview[] {
  return [...students].sort((a, b) =>
    sortKey === 'name'
      ? a.displayName.localeCompare(b.displayName, 'pt-BR')
      : new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime(),
  );
}

// 6.3/6.4 — painel do professor: progresso por aluno da própria turma (6.3)
// e visão agregada (6.4), reaproveitando o motor 6.1. Área de staff — tema
// mais rico que o do aluno (3.11, `.staff-theme`), mas MESMA fundação de
// componente (Radix/React Aria, ver components/ui/) — regra não-negociável
// 1 protege a experiência do aluno, não a do professor, e este é o painel
// que concentra quase todos os bugs visuais reportados nos prints de 3.11
// (título sobreposto, "← Voltar" sem affordance, card sem elevação, toggle
// sem componente de verdade, dropdown nativo, tabela sem ritmo).
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
    <main className="teacher-metrics staff-theme page">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
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
            <SelectableCard
              key={classroom.id}
              align="start"
              icon="📚"
              selected={classroom.id === selectedClassroomId}
              onSelect={() =>
                setSelectedClassroomId(classroom.id === selectedClassroomId ? null : classroom.id)
              }
              meta={`Código: ${classroom.joinCode} · ${classroom.activeStudentsToday} aluno(s) ativo(s) hoje`}
            >
              {classroom.name}
            </SelectableCard>
          ))}
        </div>
      )}

      {selectedClassroom && (
        <section className="teacher-metrics__detail">
          <SegmentedControl
            options={VIEW_OPTIONS}
            value={view}
            onValueChange={(next) => setView(next as 'students' | 'summary')}
            ariaLabel="Visão do painel da turma"
          />

          {view === 'students' && (
            <div className="teacher-metrics__students-view">
              {students === null && <p className="teacher-metrics__loading">Carregando alunos…</p>}

              {students !== null && students.length === 0 && (
                <p className="teacher-metrics__empty">Nenhum aluno matriculado nesta turma ainda.</p>
              )}

              {students !== null && sortedStudents !== null && students.length > 0 && (
                <>
                  <Select
                    id="teacher-metrics-sort"
                    label="Ordenar por"
                    options={SORT_OPTIONS}
                    value={sortKey}
                    onValueChange={(next) => setSortKey(next as SortKey)}
                  />

                  <Table ariaLabel="Progresso por aluno">
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Aluno</TableHeaderCell>
                        <TableHeaderCell>Matrícula</TableHeaderCell>
                        {challengeColumns.map((challenge) => (
                          <TableHeaderCell key={challenge.challengeId}>
                            <span>{challenge.title}</span>
                            <span className="teacher-metrics__stage-tag">
                              {STAGE_LABEL[challenge.stage]}
                            </span>
                          </TableHeaderCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedStudents.map((student) => (
                        <TableRow key={student.studentPseudoId}>
                          <TableCell>{student.displayName}</TableCell>
                          <TableCell>{new Date(student.enrolledAt).toLocaleDateString('pt-BR')}</TableCell>
                          {student.challenges.map((challenge) => (
                            <TableCell key={challenge.challengeId}>
                              <Badge variant={STATUS_VARIANT[challenge.status]}>
                                {STATUS_LABEL[challenge.status]}
                              </Badge>
                              <span className="teacher-metrics__attempts">
                                {challenge.attempts} tentativa{challenge.attempts === 1 ? '' : 's'}
                              </span>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
