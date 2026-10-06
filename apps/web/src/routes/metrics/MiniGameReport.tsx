import { useEffect, useState } from 'react';
import { BarChart, type BarDatum } from '../../components/charts/BarChart';
import { BoxPlot, type DescriptiveStats } from '../../components/charts/BoxPlot';
import { SampleSizeNote, StatList } from '../../components/charts/StatSummary';
import { formatNumber } from '../../components/charts/format';
import { apiClient } from '../../lib/apiClient';
import { LinkButton, Select } from '../../components/ui';
import './MiniGameReport.css';

type MiniGameStage = 'use' | 'modify' | 'create';

interface MiniGameLevelPickerOption {
  id: string;
  title: string;
  stage: MiniGameStage;
  conceptId: string;
}

interface FrequencyBucket {
  label: string;
  count: number;
}

interface RateSummary {
  n: number;
  ratePercent: number | null;
}

interface MiniGameLevelDepthReport {
  levelId: string;
  title: string;
  stage: MiniGameStage;
  conceptId: string;
  minSampleSizeThreshold: number;
  studentsReached: number;
  studentsCompleted: number;
  roundsPerStudent: DescriptiveStats;
  roundsHistogram: FrequencyBucket[];
  timeToFirstExecutionMs: DescriptiveStats;
  eventsByCategory: Record<string, number>;
  eventsByType: FrequencyBucket[];
  abandonmentCount: number;
  predictAnswerRate: RateSummary;
}

const STAGE_LABEL: Record<MiniGameStage, string> = {
  use: 'Observar (Use)',
  modify: 'Modificar (Modify)',
  create: 'Criar (Create)',
};

const EVENT_CATEGORY_ORDER = ['RD-I', 'RD-P', 'RD-C', 'RD-E', 'RD-L'];

function categoryToBarData(record: Record<string, number>): BarDatum[] {
  return EVENT_CATEGORY_ORDER.map((label) => ({ label, count: record[label] ?? 0 }));
}

function statsToSeconds(stats: DescriptiveStats): DescriptiveStats {
  const toSeconds = (value: number | null) => (value === null ? null : value / 1000);
  return {
    n: stats.n,
    mean: toSeconds(stats.mean),
    median: toSeconds(stats.median),
    stdDev: toSeconds(stats.stdDev),
    min: toSeconds(stats.min),
    max: toSeconds(stats.max),
    q1: toSeconds(stats.q1),
    q3: toSeconds(stats.q3),
  };
}

// Métricas dos eventos de mini jogo pro admin (pedido explícito do
// produto) - mesmo padrão de ChallengeReport.tsx (6.5), reaproveitando os
// MESMOS componentes de gráfico (nenhuma paleta/formato novo). RD-E
// (abandono) aparece só como número bruto, nunca "possível dificuldade"
// (regra não-negociável 7).
export function MiniGameReport() {
  const [levels, setLevels] = useState<MiniGameLevelPickerOption[] | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [report, setReport] = useState<MiniGameLevelDepthReport | null>(null);

  useEffect(() => {
    apiClient.get<MiniGameLevelPickerOption[]>('/metrics/admin/minigames').then(setLevels);
  }, []);

  useEffect(() => {
    if (!selectedLevelId) {
      setReport(null);
      return;
    }
    setReport(null);
    apiClient
      .get<MiniGameLevelDepthReport>(`/metrics/admin/minigames/${selectedLevelId}`)
      .then(setReport);
  }, [selectedLevelId]);

  return (
    <main className="minigame-report staff-theme page">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Relatório de mini jogos</h1>
      <p className="minigame-report__subtitle">
        Como os alunos interagiram com cada nível do mini jogo "Fábrica de Pedaços Iguais" -
        mesmo nível de profundidade já dado ao desafio de blocos.
      </p>

      {levels === null && <p className="minigame-report__loading">Carregando níveis…</p>}
      {levels !== null && levels.length === 0 && (
        <p className="minigame-report__empty">Nenhum nível de mini jogo cadastrado ainda.</p>
      )}

      {levels !== null && levels.length > 0 && (
        <div className="minigame-report__picker">
          <Select
            id="minigame-report-picker"
            label="Nível"
            placeholder="Selecione um nível…"
            value={selectedLevelId ?? ''}
            onValueChange={(next) => setSelectedLevelId(next || null)}
            options={levels.map((level) => ({
              value: level.id,
              label: `${level.title} (${STAGE_LABEL[level.stage]})`,
            }))}
          />
        </div>
      )}

      {selectedLevelId && report === null && (
        <p className="minigame-report__loading">Carregando relatório…</p>
      )}

      {report && <ReportBody report={report} />}
    </main>
  );
}

function ReportBody({ report }: { report: MiniGameLevelDepthReport }) {
  const threshold = report.minSampleSizeThreshold;

  return (
    <section className="minigame-report__body">
      <header className="minigame-report__header">
        <h2>{report.title}</h2>
        <span className="minigame-report__stage-tag">{STAGE_LABEL[report.stage]}</span>
      </header>

      <div className="minigame-report__headline-stats">
        <HeadlineStat label="Alunos que chegaram ao nível" value={report.studentsReached} />
        <HeadlineStat label="Alunos que concluíram" value={report.studentsCompleted} />
        <HeadlineStat label="Abandonos (RD-E, dado bruto)" value={report.abandonmentCount} />
      </div>

      <div className="minigame-report__grid">
        <DistributionCard
          title={'Rodadas ("Executar") por aluno'}
          stats={report.roundsPerStudent}
          unit=""
          threshold={threshold}
          ariaLabel="Distribuição de rodadas por aluno"
        />
        <ChartCard title="Frequência de rodadas (1, 2, 3, 4+)">
          <BarChart data={report.roundsHistogram} ariaLabel="Frequência de rodadas por aluno" />
        </ChartCard>

        <DistributionCard
          title="Tempo até a primeira execução"
          stats={statsToSeconds(report.timeToFirstExecutionMs)}
          unit=" s"
          threshold={threshold}
          ariaLabel="Distribuição do tempo até a primeira execução"
        />

        <div className="minigame-report__card">
          <h4>Taxa de resposta da predição opcional</h4>
          <p className="minigame-report__plain-stat">
            {report.predictAnswerRate.ratePercent === null
              ? '- (N=0)'
              : `${formatNumber(report.predictAnswerRate.ratePercent)}%`}{' '}
            (N={report.predictAnswerRate.n} alunos)
          </p>
          <SampleSizeNote n={report.predictAnswerRate.n} threshold={threshold} />
        </div>

        <ChartCard title="Eventos por categoria (RD-I/P/C/E/L)">
          <BarChart data={categoryToBarData(report.eventsByCategory)} ariaLabel="Contagem de eventos por categoria" />
        </ChartCard>
        <ChartCard title="Eventos por tipo">
          <BarChart data={report.eventsByType} ariaLabel="Contagem de eventos por tipo" />
        </ChartCard>
      </div>
    </section>
  );
}

function HeadlineStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="minigame-report__headline-stat">
      <span className="minigame-report__headline-stat-value">{value}</span>
      <span className="minigame-report__headline-stat-label">{label}</span>
    </span>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="minigame-report__card">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function DistributionCard({
  title,
  stats,
  unit,
  threshold,
  ariaLabel,
}: {
  title: string;
  stats: DescriptiveStats;
  unit: string;
  threshold: number;
  ariaLabel: string;
}) {
  return (
    <div className="minigame-report__card">
      <h4>{title}</h4>
      <StatList stats={stats} unit={unit} />
      <SampleSizeNote n={stats.n} threshold={threshold} />
      <BoxPlot stats={stats} unit={unit} ariaLabel={ariaLabel} />
    </div>
  );
}

export default MiniGameReport;
