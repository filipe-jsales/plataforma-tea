import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { ChallengeReport } from './ChallengeReport';

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);

beforeEach(() => {
  mockedGet.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ChallengeReport />
    </MemoryRouter>,
  );
}

const challenges = [
  { id: 'c1', title: 'Monte o quadrado', stage: 'use' as const, topicName: 'Ângulos e formas' },
  { id: 'c2', title: 'Monte o quadrado — agora mude!', stage: 'modify' as const, topicName: 'Ângulos e formas' },
  { id: 'c3', title: 'Monte o quadrado — sua vez!', stage: 'create' as const, topicName: 'Ângulos e formas' },
];

const emptyStats = { n: 0, mean: null, median: null, stdDev: null, min: null, max: null, q1: null, q3: null };

function baseReport(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    challengeId: 'c3',
    title: 'Monte o quadrado — sua vez!',
    stage: 'create' as const,
    minSampleSizeThreshold: 5,
    studentsReached: 0,
    studentsCompleted: 0,
    attemptsPerStudent: emptyStats,
    attemptsHistogram: [],
    timeToFirstExecutionMs: emptyStats,
    eventsByCategory: { 'RD-I': 0, 'RD-P': 0, 'RD-C': 0, 'RD-E': 0, 'RD-L': 0 },
    eventsByType: [],
    ...overrides,
  };
}

describe('ChallengeReport', () => {
  it('shows an empty state when there is no challenge cadastrado', async () => {
    mockedGet.mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText('Nenhum desafio cadastrado ainda.')).toBeInTheDocument();
  });

  it('lists every challenge in the picker with topic + stage', async () => {
    mockedGet.mockResolvedValueOnce(challenges);

    renderPage();

    expect(await screen.findByText(/Monte o quadrado \(Observar \(Use\)\)/)).toBeInTheDocument();
  });

  it('fetches and renders the report for the selected challenge, never before a selection', async () => {
    mockedGet.mockResolvedValueOnce(challenges);
    mockedGet.mockResolvedValueOnce(
      baseReport({ studentsReached: 4, studentsCompleted: 2 }),
    );

    renderPage();

    expect(mockedGet).toHaveBeenCalledTimes(1);
    const select = await screen.findByLabelText(/Desafio/);
    await userEvent.selectOptions(select, 'c3');

    expect(await screen.findByRole('heading', { name: 'Monte o quadrado — sua vez!' })).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith('/metrics/admin/challenges/c3');
  });

  it('shows the Modify section only for a stage "modify" report, never the Use section', async () => {
    mockedGet.mockResolvedValueOnce(challenges);
    mockedGet.mockResolvedValueOnce(
      baseReport({
        challengeId: 'c2',
        title: 'Monte o quadrado — agora mude!',
        stage: 'modify',
        modifyInsights: {
          attemptsUntilMatch: emptyStats,
          predictionMatchRate: {
            aggregate: { n: 0, ratePercent: null },
            perStudent: { n: 0, meanPercent: null, stdDevPercent: null },
            perStudentHistogram: [],
          },
          mostChangedFieldDistribution: [],
          attemptsVsMatchRateScatter: [],
        },
      }),
    );

    renderPage();

    const select = await screen.findByLabelText(/Desafio/);
    await userEvent.selectOptions(select, 'c2');

    expect(await screen.findByRole('heading', { name: 'Estágio Modify' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Estágio Use' })).not.toBeInTheDocument();
  });

  it('shows neither Modify nor Use section for a stage "create" report (AC de 6.5)', async () => {
    mockedGet.mockResolvedValueOnce(challenges);
    mockedGet.mockResolvedValueOnce(baseReport());

    renderPage();

    const select = await screen.findByLabelText(/Desafio/);
    await userEvent.selectOptions(select, 'c3');

    await screen.findByRole('heading', { name: 'Monte o quadrado — sua vez!' });
    expect(screen.queryByRole('heading', { name: 'Estágio Modify' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Estágio Use' })).not.toBeInTheDocument();
  });

  it('shows the small-sample warning when N is below the configured threshold', async () => {
    mockedGet.mockResolvedValueOnce(challenges);
    mockedGet.mockResolvedValueOnce(
      baseReport({
        studentsReached: 3,
        minSampleSizeThreshold: 5,
        attemptsPerStudent: { n: 3, mean: 2, median: 2, stdDev: 1, min: 1, max: 3, q1: 1.5, q3: 2.5 },
      }),
    );

    renderPage();

    const select = await screen.findByLabelText(/Desafio/);
    await userEvent.selectOptions(select, 'c3');

    expect(await screen.findByText(/N=3 — abaixo do mínimo configurado \(5\)/)).toBeInTheDocument();
  });

  it('never shows an individual student name/pseudonym anywhere on the report', async () => {
    mockedGet.mockResolvedValueOnce(challenges);
    mockedGet.mockResolvedValueOnce(baseReport({ studentsReached: 2, studentsCompleted: 1 }));

    renderPage();

    const select = await screen.findByLabelText(/Desafio/);
    await userEvent.selectOptions(select, 'c3');
    await screen.findByRole('heading', { name: 'Monte o quadrado — sua vez!' });

    expect(screen.queryByText(/pseudo/i)).not.toBeInTheDocument();
  });
});
