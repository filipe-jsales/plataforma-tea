import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import {
  Badge,
  Button,
  Dialog,
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
  ToggleSwitch,
  type BadgeVariant,
} from '../../components/ui';
import './TeacherMetrics.css';
import { ChartColumn, LibraryBig } from 'lucide-react';

type ChallengeStage = 'use' | 'modify' | 'create';
type ChallengeStatus = 'not_started' | 'in_progress' | 'completed';
type SortKey = 'enrolledAt' | 'name';

interface TeacherClassroomOption {
  id: string;
  name: string;
  joinCode: string;
  activeStudentsToday: number;
  // 4.3/7.3 - estado atual do toggle "comparação entre alunos" desta turma.
  comparisonEnabled: boolean;
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

// MJ8 - os dois sinais (desafio de blocos × mini jogo) lado a lado, pro
// mesmo conceito. Mesmo vocabulário de status (not_started/in_progress/
// completed) dos dois lados, pra caber no mesmo Badge sem o professor
// precisar aprender dois jeitos de ler a tela.
interface ConceptComparisonSignal {
  title: string;
  stage: ChallengeStage;
  status: ChallengeStatus;
  attempts?: number;
}

interface ConceptComparisonStudent {
  studentPseudoId: string;
  displayName: string;
  blocks: ConceptComparisonSignal[];
  miniGame: ConceptComparisonSignal[];
}

interface ConceptComparison {
  conceptId: string;
  hasBlocksChallenge: boolean;
  hasMiniGame: boolean;
  students: ConceptComparisonStudent[];
}

// Único conceito com mini jogo hoje - sem seletor de propósito (nada além
// disso pra escolher ainda). Vira um <Select> quando existir um 2º.
const CONCEPT_ID = 'fractions_equal_parts';
const CONCEPT_LABEL = 'Frações (Fábrica de Pedaços Iguais)';

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

// 3.11 - "Concluído" continua verde, "Em andamento" continua o mesmo
// amarelo de aviso (não-punitivo: cor expressiva no feedback positivo,
// nunca no negativo) - só o COMPONENTE (Badge) muda, a semântica de cor é a
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
  { value: 'concept', label: 'Blocos × jogo' },
];

function sortStudents(students: StudentProgressOverview[], sortKey: SortKey): StudentProgressOverview[] {
  return [...students].sort((a, b) =>
    sortKey === 'name'
      ? a.displayName.localeCompare(b.displayName, 'pt-BR')
      : new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime(),
  );
}

// 6.3/6.4 - painel do professor: progresso por aluno da própria turma (6.3)
// e visão agregada (6.4), reaproveitando o motor 6.1. Área de staff - tema
// mais rico que o do aluno (3.11, `.staff-theme`), mas MESMA fundação de
// componente (Radix/React Aria, ver components/ui/) - regra não-negociável
// 1 protege a experiência do aluno, não a do professor, e este é o painel
// que concentra quase todos os bugs visuais reportados nos prints de 3.11
// (título sobreposto, "← Voltar" sem affordance, card sem elevação, toggle
// sem componente de verdade, dropdown nativo, tabela sem ritmo).
export function TeacherMetrics() {
  const [classrooms, setClassrooms] = useState<TeacherClassroomOption[] | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [view, setView] = useState<'students' | 'summary' | 'concept'>('students');
  const [students, setStudents] = useState<StudentProgressOverview[] | null>(null);
  const [summary, setSummary] = useState<ClassroomSummary | null>(null);
  const [conceptComparison, setConceptComparison] = useState<ConceptComparison | null>(null);
  // AC de 6.3: ordenação default nunca é por desempenho - só nome ou data de
  // matrícula, e a troca é sempre uma escolha explícita do professor.
  const [sortKey, setSortKey] = useState<SortKey>('enrolledAt');
  // 4.3/7.3 - confirmação obrigatória antes de LIGAR a comparação (evita
  // ativação acidental, AC de 7.3); desligar é imediato, sem confirmação -
  // só remove um elemento, não introduz um novo pro aluno ver.
  const [confirmComparisonDialogOpen, setConfirmComparisonDialogOpen] = useState(false);

  useEffect(() => {
    apiClient.get<TeacherClassroomOption[]>('/home/teacher').then(setClassrooms);
  }, []);

  useEffect(() => {
    if (!selectedClassroomId) {
      setStudents(null);
      setSummary(null);
      setConceptComparison(null);
      return;
    }
    setStudents(null);
    setSummary(null);
    setConceptComparison(null);
    apiClient
      .get<StudentProgressOverview[]>(`/metrics/teacher/classrooms/${selectedClassroomId}/students`)
      .then(setStudents);
    apiClient
      .get<ClassroomSummary>(`/metrics/teacher/classrooms/${selectedClassroomId}/summary`)
      .then(setSummary);
    apiClient
      .get<ConceptComparison>(
        `/metrics/teacher/classrooms/${selectedClassroomId}/concept-comparison?conceptId=${CONCEPT_ID}`,
      )
      .then(setConceptComparison);
  }, [selectedClassroomId]);

  const selectedClassroom = classrooms?.find((classroom) => classroom.id === selectedClassroomId) ?? null;
  const sortedStudents = students ? sortStudents(students, sortKey) : null;
  const challengeColumns = sortedStudents?.[0]?.challenges ?? [];

  // 4.3/7.3 - só este campo muda no estado local; nenhuma outra métrica
  // depende dele, então não há necessidade de refazer as buscas da turma.
  async function updateComparisonSetting(classroomId: string, enabled: boolean) {
    await apiClient.patch<{ classroomId: string; enabled: boolean }>(
      `/teacher/classrooms/${classroomId}/comparison-setting`,
      { enabled },
    );
    setClassrooms(
      (current) =>
        current?.map((classroom) =>
          classroom.id === classroomId ? { ...classroom, comparisonEnabled: enabled } : classroom,
        ) ?? current,
    );
  }

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
              icon={<LibraryBig />}
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
          {/* 4.3/7.3 - toggle nasce OFF (regra não-negociável 5). Ligar
              exige confirmação explícita (evita ativação acidental); desligar
              é imediato e some da tela do aluno sem precisar recarregar
              sessão (o aluno já refaz `GET /home/student` a cada visita). */}
          <section className="teacher-metrics__comparison-setting">
            <ToggleSwitch
              id="classroom-comparison-toggle"
              icon={<ChartColumn />}
              label="Comparação entre alunos nesta turma"
              checked={selectedClassroom.comparisonEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  setConfirmComparisonDialogOpen(true);
                } else {
                  void updateComparisonSetting(selectedClassroom.id, false);
                }
              }}
            />
          </section>

          <Dialog
            open={confirmComparisonDialogOpen}
            onOpenChange={setConfirmComparisonDialogOpen}
            title="Ativar comparação entre alunos?"
            description={
              <>
                A partir de agora, a tela &quot;Meu progresso&quot; de cada aluno desta turma pode
                mostrar uma mensagem agregada e anônima sobre a prática da semana, nunca o nome, o
                avatar ou o desempenho de um colega específico. Você pode desligar a qualquer momento.
              </>
            }
          >
            <Button
              icon={<ChartColumn />}
              onClick={() => {
                setConfirmComparisonDialogOpen(false);
                void updateComparisonSetting(selectedClassroom.id, true);
              }}
            >
              Ativar comparação
            </Button>
          </Dialog>

          <SegmentedControl
            options={VIEW_OPTIONS}
            value={view}
            onValueChange={(next) => setView(next as 'students' | 'summary' | 'concept')}
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

          {view === 'concept' && (
            <div className="teacher-metrics__concept-view">
              {conceptComparison === null && <p className="teacher-metrics__loading">Carregando…</p>}

              {conceptComparison !== null && (
                <>
                  <p className="teacher-metrics__subtitle">
                    {CONCEPT_LABEL} 
                  </p>

                  {!conceptComparison.hasBlocksChallenge && (
                    <p className="teacher-metrics__empty">
                      Nenhum desafio de blocos deste assunto cadastrado ainda.
                    </p>
                  )}

                  {conceptComparison.students.length === 0 && (
                    <p className="teacher-metrics__empty">Nenhum aluno matriculado nesta turma ainda.</p>
                  )}

                  {conceptComparison.students.length > 0 && (
                    <Table ariaLabel="Comparação entre desafio de blocos e mini jogo, por aluno">
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Aluno</TableHeaderCell>
                          {conceptComparison.students[0].blocks.map((signal, index) => (
                            <TableHeaderCell key={`blocks-${index}`}>
                              <span>🧩 {signal.title}</span>
                              <span className="teacher-metrics__stage-tag">{STAGE_LABEL[signal.stage]}</span>
                            </TableHeaderCell>
                          ))}
                          {conceptComparison.students[0].miniGame.map((signal, index) => (
                            <TableHeaderCell key={`minigame-${index}`}>
                              <span>🎮 {signal.title}</span>
                              <span className="teacher-metrics__stage-tag">{STAGE_LABEL[signal.stage]}</span>
                            </TableHeaderCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {conceptComparison.students.map((student) => (
                          <TableRow key={student.studentPseudoId}>
                            <TableCell>{student.displayName}</TableCell>
                            {student.blocks.map((signal, index) => (
                              <TableCell key={`blocks-${index}`}>
                                <Badge variant={STATUS_VARIANT[signal.status]}>
                                  {STATUS_LABEL[signal.status]}
                                </Badge>
                              </TableCell>
                            ))}
                            {student.miniGame.map((signal, index) => (
                              <TableCell key={`minigame-${index}`}>
                                <Badge variant={STATUS_VARIANT[signal.status]}>
                                  {STATUS_LABEL[signal.status]}
                                </Badge>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
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
// estágio), nunca uma tabela de números - largura estática por dado, sem
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
