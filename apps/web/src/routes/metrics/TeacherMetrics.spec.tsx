import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { TeacherMetrics } from './TeacherMetrics';

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
      <TeacherMetrics />
    </MemoryRouter>,
  );
}

const classroom = { id: 'c1', name: 'Turma Azul', joinCode: 'AZUL-1', activeStudentsToday: 1 };

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

    renderPage();

    await userEvent.click(await screen.findByText('Turma Azul'));
    await userEvent.click(await screen.findByText('Turma toda'));

    expect(await screen.findByText('Nenhum aluno ativo nesta turma ainda.')).toBeInTheDocument();
  });
});
