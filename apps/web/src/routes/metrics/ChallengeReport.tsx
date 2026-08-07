import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, type BarDatum } from '../../components/charts/BarChart';
import { BoxPlot, type DescriptiveStats } from '../../components/charts/BoxPlot';
import { ScatterPlot } from '../../components/charts/ScatterPlot';
import { SampleSizeNote, StatList } from '../../components/charts/StatSummary';
import { formatNumber } from '../../components/charts/format';
import { apiClient } from '../../lib/apiClient';
import './ChallengeReport.css';

type ChallengeStage = 'use' | 'modify' | 'create';

interface ChallengePickerOption {
  id: string;
  title: string;
  stage: ChallengeStage | null;
  topicName: string;
}

interface FrequencyBucket {
  label: string;
  count: number;
}

interface RateSummary {
  n: number;
  ratePercent: number | null;
}

interface PerStudentRateSummary {
  n: number;
  meanPercent: number | null;
  stdDevPercent: number | null;
}

interface RateReport {
  aggregate: RateSummary;
  perStudent: PerStudentRateSummary;
  perStudentHistogram: FrequencyBucket[];
}

interface ModifyInsights {
  attemptsUntilMatch: DescriptiveStats;
  predictionMatchRate: RateReport;
  mostChangedFieldDistribution: FrequencyBucket[];
  attemptsVsMatchRateScatter: { attempts: number; matchRatePercent: number }[];
}

interface UseInsights {
  attemptsBeforeProceed: DescriptiveStats;
  predictionMatchRate: RateReport;
  investigationResponses: { n: number };
}

interface ChallengeDepthReport {
  challengeId: string;
  title: string;
  stage: ChallengeStage;
  minSampleSizeThreshold: number;
  studentsReached: number;
  studentsCompleted: number;
  attemptsPerStudent: DescriptiveStats;
  attemptsHistogram: FrequencyBucket[];
  timeToFirstExecutionMs: DescriptiveStats;
  eventsByCategory: Record<string, number>;
  eventsByType: FrequencyBucket[];
  modifyInsights?: ModifyInsights;
  useInsights?: UseInsights;
}

const STAGE_LABEL: Record<ChallengeStage, string> = {
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

// 6.5 — relatório de profundidade por desafio, "o que um revisor de artigo
// esperaria ver": todo número vem com o N sobre o qual foi calculado (AC de
// 6.5), acompanhado do gráfico recomendado pro tipo de dado (boxplot pra
// dispersão, histograma pra distribuição de frequência, barra pra
// contagem categórica, scatter pra correlação entre duas variáveis por
// aluno). Nunca nome de aluno nesta tela — é sempre agregado/distribuição.
export function ChallengeReport() {
  const [challenges, setChallenges] = useState<ChallengePickerOption[] | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [report, setReport] = useState<ChallengeDepthReport | null>(null);

  useEffect(() => {
    apiClient.get<ChallengePickerOption[]>('/metrics/admin/challenges').then(setChallenges);
  }, []);

  useEffect(() => {
    if (!selectedChallengeId) {
      setReport(null);
      return;
    }
    setReport(null);
    apiClient
      .get<ChallengeDepthReport>(`/metrics/admin/challenges/${selectedChallengeId}`)
      .then(setReport);
  }, [selectedChallengeId]);

  return (
    <main className="challenge-report">
      <Link to="/home" className="challenge-report__back-link">
        ← Voltar
      </Link>
      <h1>Relatório de profundidade por desafio</h1>
      <p className="challenge-report__subtitle">
        Estatística descritiva completa de como os alunos interagiram com um desafio
        específico — dado pronto pra virar tabela/figura de pesquisa.
      </p>

      {challenges === null && <p className="challenge-report__loading">Carregando desafios…</p>}
      {challenges !== null && challenges.length === 0 && (
        <p className="challenge-report__empty">Nenhum desafio cadastrado ainda.</p>
      )}

      {challenges !== null && challenges.length > 0 && (
        <label className="challenge-report__picker">
          Desafio:{' '}
          <select
            value={selectedChallengeId ?? ''}
            onChange={(event) => setSelectedChallengeId(event.target.value || null)}
          >
            <option value="">Selecione um desafio…</option>
            {challenges.map((challenge) => (
              <option key={challenge.id} value={challenge.id}>
                {challenge.topicName} — {challenge.title}
                {challenge.stage ? ` (${STAGE_LABEL[challenge.stage]})` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {selectedChallengeId && report === null && (
        <p className="challenge-report__loading">Carregando relatório…</p>
      )}

      {report && <ReportBody report={report} />}
    </main>
  );
}

function ReportBody({ report }: { report: ChallengeDepthReport }) {
  const threshold = report.minSampleSizeThreshold;

  return (
    <section className="challenge-report__body">
      <header className="challenge-report__header">
        <h2>{report.title}</h2>
        <span className="challenge-report__stage-tag">{STAGE_LABEL[report.stage]}</span>
      </header>

      <div className="challenge-report__headline-stats">
        <HeadlineStat label="Alunos que chegaram ao desafio" value={report.studentsReached} />
        <HeadlineStat label="Alunos que concluíram" value={report.studentsCompleted} />
      </div>

      <div className="challenge-report__grid">
        <DistributionCard
          title="Tentativas por aluno"
          stats={report.attemptsPerStudent}
          unit=""
          threshold={threshold}
          ariaLabel="Distribuição de tentativas por aluno"
        />
        <ChartCard title="Frequência de tentativas (1, 2, 3, 4+)">
          <BarChart data={report.attemptsHistogram} ariaLabel="Frequência de tentativas por aluno" />
        </ChartCard>

        <DistributionCard
          title="Tempo até a primeira execução"
          stats={statsToSeconds(report.timeToFirstExecutionMs)}
          unit=" s"
          threshold={threshold}
          ariaLabel="Distribuição do tempo até a primeira execução"
        />

        <ChartCard title="Eventos por categoria (RD-I/P/C/E/L)">
          <BarChart data={categoryToBarData(report.eventsByCategory)} ariaLabel="Contagem de eventos por categoria" />
        </ChartCard>
        <ChartCard title="Eventos por tipo">
          <BarChart data={report.eventsByType} ariaLabel="Contagem de eventos por tipo" />
        </ChartCard>
      </div>

      {report.modifyInsights && <ModifySection insights={report.modifyInsights} threshold={threshold} />}
      {report.useInsights && <UseSection insights={report.useInsights} threshold={threshold} />}
    </section>
  );
}

function ModifySection({ insights, threshold }: { insights: ModifyInsights; threshold: number }) {
  return (
    <div className="challenge-report__section">
      <h3>Estágio Modify</h3>
      <div className="challenge-report__grid">
        <DistributionCard
          title="Tentativas até a previsão bater com o resultado"
          stats={insights.attemptsUntilMatch}
          unit=""
          threshold={threshold}
          ariaLabel="Distribuição de tentativas até a previsão bater com o resultado"
        />
        <RateCard title="Taxa de acerto da previsão" rate={insights.predictionMatchRate} threshold={threshold} />
        <ChartCard title="Variável mais alterada entre tentativas">
          <BarChart data={insights.mostChangedFieldDistribution} ariaLabel="Distribuição de campos alterados" />
        </ChartCard>
        <ChartCard title="Tentativas × taxa de acerto por aluno">
          <ScatterPlot
            points={insights.attemptsVsMatchRateScatter.map((point) => ({
              x: point.attempts,
              y: point.matchRatePercent,
            }))}
            xLabel="Tentativas"
            yLabel="Acerto (%)"
            ariaLabel="Dispersão entre tentativas e taxa de acerto individual"
          />
        </ChartCard>
      </div>
    </div>
  );
}

function UseSection({ insights, threshold }: { insights: UseInsights; threshold: number }) {
  return (
    <div className="challenge-report__section">
      <h3>Estágio Use</h3>
      <div className="challenge-report__grid">
        <DistributionCard
          title="Tentativas antes de avançar"
          stats={insights.attemptsBeforeProceed}
          unit=""
          threshold={threshold}
          ariaLabel="Distribuição de tentativas antes de avançar"
        />
        <RateCard
          title="Taxa de acerto da previsão inicial"
          rate={insights.predictionMatchRate}
          threshold={threshold}
        />
        <ChartCard title="Respostas de investigação registradas">
          <p className="challenge-report__plain-stat">
            N={insights.investigationResponses.n} aluno(s) responderam.
          </p>
        </ChartCard>
      </div>
    </div>
  );
}

function HeadlineStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="challenge-report__headline-stat">
      <span className="challenge-report__headline-stat-value">{value}</span>
      <span className="challenge-report__headline-stat-label">{label}</span>
    </span>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="challenge-report__card">
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
    <div className="challenge-report__card">
      <h4>{title}</h4>
      <StatList stats={stats} unit={unit} />
      <SampleSizeNote n={stats.n} threshold={threshold} />
      <BoxPlot stats={stats} unit={unit} ariaLabel={ariaLabel} />
    </div>
  );
}

function RateCard({ title, rate, threshold }: { title: string; rate: RateReport; threshold: number }) {
  return (
    <div className="challenge-report__card">
      <h4>{title}</h4>
      <p className="challenge-report__plain-stat">
        Agregada: {rate.aggregate.ratePercent === null ? '— (N=0)' : `${formatNumber(rate.aggregate.ratePercent)}%`}{' '}
        (N={rate.aggregate.n} tentativas)
      </p>
      <SampleSizeNote n={rate.aggregate.n} threshold={threshold} />
      <p className="challenge-report__plain-stat">
        Por aluno: média{' '}
        {rate.perStudent.meanPercent === null ? '—' : `${formatNumber(rate.perStudent.meanPercent)}%`}, desvio
        padrão {rate.perStudent.stdDevPercent === null ? '— (N<2)' : `${formatNumber(rate.perStudent.stdDevPercent)}%`}{' '}
        (N={rate.perStudent.n} alunos)
      </p>
      <SampleSizeNote n={rate.perStudent.n} threshold={threshold} />
      <BarChart data={rate.perStudentHistogram} ariaLabel={`${title} — distribuição por aluno`} />
    </div>
  );
}
