import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { TeacherMetrics } from './TeacherMetrics';

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPatch = vi.mocked(apiClient.patch);

beforeEach(() => {
  mockedGet.mockReset();
  mockedPatch.mockReset().mockResolvedValue({ classroomId: 'c1', enabled: true });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <TeacherMetrics />
    </MemoryRouter>,
  );
}

const classroom = {
  id: 'c1',
  name: 'Turma Azul',
  joinCode: 'AZUL-1',
  activeStudentsToday: 1,
  comparisonEnabled: false,
};

const EMPTY_CONCEPT_COMPARISON = {
  conceptId: 'fractions_equal_parts',
  hasBlocksChallenge: false,
  hasMiniGame: true,
  students: [],
};

describe('TeacherMetrics', () => {
  it('shows an empty state when the teacher has no classroom assigned yet, never an error', async () => {
    mockedGet.mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText('Nenhuma turma atribuída a você ainda.')).toBeInTheDocument();
  });

  it('shows an empty state for a classroom with no enrolled student (6.3 AC), never an error', async () => {
    mockedGet.mockResolvedValueOnce([classroom]);
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce({
      totalStudents: 0,
      activeStudentsToday: 0,
      byStage: [],
      helpButtonUsageRate: 0,
    });
    mockedGet.mockResolvedValueOnce(EMPTY_CONCEPT_COMPARISON);

    renderPage();

    await userEvent.click(await screen.findByText('Turma Azul'));

    expect(
      await screen.findByText('Nenhum aluno matriculado nesta turma ainda.'),
    ).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith('/metrics/teacher/classrooms/c1/students');
  });

  it('renders each student with, per challenge, its stage/status/attempts — never sorted by performance by default', async () => {
    mockedGet.mockResolvedValueOnce([classroom]);
    mockedGet.mockResolvedValueOnce([
      {
        studentPseudoId: 'p1',
        displayName: 'Ana',
        enrolledAt: '2026-01-01T00:00:00.000Z',
        challenges: [
          { challengeId: 'ch1', title: 'Monte o quadrado', stage: 'use', status: 'completed', attempts: 2 },
        ],
      },
      {
        studentPseudoId: 'p2',
        displayName: 'Bia',
        enrolledAt: '2026-02-01T00:00:00.000Z',
        challenges: [
          { challengeId: 'ch1', title: 'Monte o quadrado', stage: 'use', status: 'not_started', attempts: 0 },
        ],
      },
    ]);
    mockedGet.mockResolvedValueOnce({
      totalStudents: 2,
      activeStudentsToday: 1,
      byStage: [{ stage: 'use', studentsCompleted: 1, studentsInProgress: 0, studentsNotStarted: 1 }],
      helpButtonUsageRate: 0,
    });
    mockedGet.mockResolvedValueOnce(EMPTY_CONCEPT_COMPARISON);

    renderPage();

    await userEvent.click(await screen.findByText('Turma Azul'));

    const rows = await screen.findAllByRole('row');
    // 1 header row + 2 student rows.
    expect(rows).toHaveLength(3);
    // Default order is enrolledAt ascending: Ana (Jan) before Bia (Fev).
    expect(rows[1]).toHaveTextContent('Ana');
    expect(rows[2]).toHaveTextContent('Bia');
    expect(screen.getByText('Concluído')).toBeInTheDocument();
    expect(screen.getByText('Não iniciado')).toBeInTheDocument();
    expect(screen.getByText('2 tentativas')).toBeInTheDocument();
  });

  it('never shows student names in the "Turma toda" aggregate view (AC de 6.4)', async () => {
    mockedGet.mockResolvedValueOnce([classroom]);
    mockedGet.mockResolvedValueOnce([
      {
        studentPseudoId: 'p1',
        displayName: 'Ana',
        enrolledAt: '2026-01-01T00:00:00.000Z',
        challenges: [],
      },
    ]);
    mockedGet.mockResolvedValueOnce({
      totalStudents: 1,
      activeStudentsToday: 1,
      byStage: [{ stage: 'create', studentsCompleted: 0, studentsInProgress: 0, studentsNotStarted: 1 }],
      helpButtonUsageRate: 40,
    });
    mockedGet.mockResolvedValueOnce(EMPTY_CONCEPT_COMPARISON);

    renderPage();

    await userEvent.click(await screen.findByText('Turma Azul'));
    await userEvent.click(await screen.findByText('Turma toda'));

    expect(await screen.findByText('40%')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });

  it('shows zeros for a classroom summary with no active student, never an error/divide-by-zero (AC de 6.4)', async () => {
    mockedGet.mockResolvedValueOnce([classroom]);
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce({
      totalStudents: 0,
      activeStudentsToday: 0,
      byStage: [],
      helpButtonUsageRate: 0,
    });
    mockedGet.mockResolvedValueOnce(EMPTY_CONCEPT_COMPARISON);

    renderPage();

    await userEvent.click(await screen.findByText('Turma Azul'));
    await userEvent.click(await screen.findByText('Turma toda'));

    expect(await screen.findByText('Nenhum aluno ativo nesta turma ainda.')).toBeInTheDocument();
  });

  it('3.11: the view switch is a real segmented control (radiogroup), not 2 independent buttons', async () => {
    mockedGet.mockResolvedValueOnce([classroom]);
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce({
      totalStudents: 0,
      activeStudentsToday: 0,
      byStage: [],
      helpButtonUsageRate: 0,
    });
    mockedGet.mockResolvedValueOnce(EMPTY_CONCEPT_COMPARISON);

    renderPage();

    await userEvent.click(await screen.findByText('Turma Azul'));

    expect(await screen.findByRole('radiogroup', { name: 'Visão do painel da turma' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Por aluno' })).toHaveAttribute('data-state', 'on');
  });

  it('3.11: the classroom card shows the join code as a visually distinct meta line, not just a raw button', async () => {
    mockedGet.mockResolvedValueOnce([classroom]);

    renderPage();

    const title = await screen.findByText('Turma Azul');
    expect(title).toHaveClass('ui-card__label');
    expect(await screen.findByText(/Código: AZUL-1/)).toHaveClass('ui-card__meta');
  });

  it('3.11: "← Voltar" navigates via a real link, styled like a button, never a bare text link', async () => {
    mockedGet.mockResolvedValueOnce([]);

    renderPage();

    const back = await screen.findByRole('link', { name: /voltar/i });
    expect(back).toHaveAttribute('href', '/home');
    expect(back).toHaveClass('ui-button');
  });

  describe('"Blocos × jogo" view (MJ8)', () => {
    it('fetches the concept-comparison endpoint with the fractions conceptId when a classroom is selected', async () => {
      mockedGet.mockResolvedValueOnce([classroom]);
      mockedGet.mockResolvedValueOnce([]);
      mockedGet.mockResolvedValueOnce({
        totalStudents: 0,
        activeStudentsToday: 0,
        byStage: [],
        helpButtonUsageRate: 0,
      });
      mockedGet.mockResolvedValueOnce(EMPTY_CONCEPT_COMPARISON);

      renderPage();
      await userEvent.click(await screen.findByText('Turma Azul'));

      await screen.findByRole('radiogroup', { name: 'Visão do painel da turma' });
      expect(mockedGet).toHaveBeenCalledWith(
        '/metrics/teacher/classrooms/c1/concept-comparison?conceptId=fractions_equal_parts',
      );
    });

    it('shows a graceful message (never an error) when there is no blocks challenge for this concept yet, and still shows the mini-game signal', async () => {
      mockedGet.mockResolvedValueOnce([classroom]);
      mockedGet.mockResolvedValueOnce([]);
      mockedGet.mockResolvedValueOnce({
        totalStudents: 0,
        activeStudentsToday: 0,
        byStage: [],
        helpButtonUsageRate: 0,
      });
      mockedGet.mockResolvedValueOnce({
        conceptId: 'fractions_equal_parts',
        hasBlocksChallenge: false,
        hasMiniGame: true,
        students: [
          {
            studentPseudoId: 'p1',
            displayName: 'Ana',
            blocks: [],
            miniGame: [{ levelId: 'l-use', title: 'Observe o pedido pronto', stage: 'use', status: 'completed' }],
          },
        ],
      });

      renderPage();
      await userEvent.click(await screen.findByText('Turma Azul'));
      await userEvent.click(await screen.findByText('Blocos × jogo'));

      expect(
        await screen.findByText(/Nenhum desafio de blocos deste assunto cadastrado ainda/),
      ).toBeInTheDocument();
      expect(await screen.findByText('Ana')).toBeInTheDocument();
      expect(screen.getByText('🎮 Observe o pedido pronto')).toBeInTheDocument();
      expect(screen.getByText('Concluído')).toBeInTheDocument();
    });

    it('shows both signals side by side for the same student when both exist, never mixing rows', async () => {
      mockedGet.mockResolvedValueOnce([classroom]);
      mockedGet.mockResolvedValueOnce([]);
      mockedGet.mockResolvedValueOnce({
        totalStudents: 0,
        activeStudentsToday: 0,
        byStage: [],
        helpButtonUsageRate: 0,
      });
      mockedGet.mockResolvedValueOnce({
        conceptId: 'fractions_equal_parts',
        hasBlocksChallenge: true,
        hasMiniGame: true,
        students: [
          {
            studentPseudoId: 'p1',
            displayName: 'Ana',
            blocks: [{ challengeId: 'ch1', title: 'Monte a fração', stage: 'use', status: 'completed', attempts: 2 }],
            miniGame: [{ levelId: 'l-use', title: 'Observe o pedido pronto', stage: 'use', status: 'in_progress' }],
          },
        ],
      });

      renderPage();
      await userEvent.click(await screen.findByText('Turma Azul'));
      await userEvent.click(await screen.findByText('Blocos × jogo'));

      expect(
        screen.queryByText(/Nenhum desafio de blocos deste assunto cadastrado ainda/),
      ).not.toBeInTheDocument();
      expect(screen.getByText('🧩 Monte a fração')).toBeInTheDocument();
      expect(screen.getByText('🎮 Observe o pedido pronto')).toBeInTheDocument();
      const row = (await screen.findByText('Ana')).closest('tr')!;
      expect(row).toHaveTextContent('Concluído');
      expect(row).toHaveTextContent('Em andamento');
    });
  });

  describe('comparação entre alunos (4.3/7.3)', () => {
    it('shows the toggle OFF by default for a classroom that never activated it', async () => {
      mockedGet.mockResolvedValueOnce([classroom]);
      mockedGet.mockResolvedValueOnce([]);
      mockedGet.mockResolvedValueOnce({ totalStudents: 0, activeStudentsToday: 0, byStage: [], helpButtonUsageRate: 0 });
      mockedGet.mockResolvedValueOnce(EMPTY_CONCEPT_COMPARISON);

      renderPage();
      await userEvent.click(await screen.findByText('Turma Azul'));

      const toggle = await screen.findByRole('switch', { name: /comparação entre alunos/i });
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('requires confirmation before turning comparison ON, and only PATCHes after confirming', async () => {
      mockedGet.mockResolvedValueOnce([classroom]);
      mockedGet.mockResolvedValueOnce([]);
      mockedGet.mockResolvedValueOnce({ totalStudents: 0, activeStudentsToday: 0, byStage: [], helpButtonUsageRate: 0 });
      mockedGet.mockResolvedValueOnce(EMPTY_CONCEPT_COMPARISON);

      renderPage();
      await userEvent.click(await screen.findByText('Turma Azul'));

      await userEvent.click(await screen.findByRole('switch', { name: /comparação entre alunos/i }));

      expect(
        await screen.findByText(/Ativar comparação entre alunos\?/i),
      ).toBeInTheDocument();
      expect(mockedPatch).not.toHaveBeenCalled();

      await userEvent.click(await screen.findByRole('button', { name: /ativar comparação/i }));

      expect(mockedPatch).toHaveBeenCalledWith('/teacher/classrooms/c1/comparison-setting', {
        enabled: true,
      });
    });

    it('turns comparison OFF immediately, with no confirmation dialog', async () => {
      mockedGet.mockResolvedValueOnce([{ ...classroom, comparisonEnabled: true }]);
      mockedGet.mockResolvedValueOnce([]);
      mockedGet.mockResolvedValueOnce({ totalStudents: 0, activeStudentsToday: 0, byStage: [], helpButtonUsageRate: 0 });
      mockedGet.mockResolvedValueOnce(EMPTY_CONCEPT_COMPARISON);
      mockedPatch.mockResolvedValueOnce({ classroomId: 'c1', enabled: false });

      renderPage();
      await userEvent.click(await screen.findByText('Turma Azul'));

      const toggle = await screen.findByRole('switch', { name: /comparação entre alunos/i });
      expect(toggle).toHaveAttribute('aria-checked', 'true');

      await userEvent.click(toggle);

      expect(screen.queryByText(/Ativar comparação entre alunos\?/i)).not.toBeInTheDocument();
      expect(mockedPatch).toHaveBeenCalledWith('/teacher/classrooms/c1/comparison-setting', {
        enabled: false,
      });
    });
  });
});
