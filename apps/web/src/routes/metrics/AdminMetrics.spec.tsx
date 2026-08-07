import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { AdminMetrics } from './AdminMetrics';

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
      <AdminMetrics />
    </MemoryRouter>,
  );
}

describe('AdminMetrics', () => {
  it('shows an empty state when there are no schools, never breaking (AC de 6.2)', async () => {
    mockedGet.mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText('Nenhuma escola cadastrada ainda.')).toBeInTheDocument();
  });

  it('renders one card per school with its aggregate stats', async () => {
    mockedGet.mockResolvedValueOnce([
      {
        id: 's1',
        name: 'Escola Azul',
        classroomsCount: 2,
        teachersCount: 1,
        activeStudentsCount: 10,
        activeStudentsToday: 3,
      },
    ]);

    renderPage();

    expect(await screen.findByText('Escola Azul')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('fetches and shows classrooms only after a school is selected, scoped to that school', async () => {
    mockedGet.mockResolvedValueOnce([
      {
        id: 's1',
        name: 'Escola Azul',
        classroomsCount: 1,
        teachersCount: 1,
        activeStudentsCount: 5,
        activeStudentsToday: 2,
      },
    ]);
    mockedGet.mockResolvedValueOnce([
      { id: 'c1', name: 'Turma A', teacherDisplayName: 'Profa. Ana', activeStudentsCount: 5 },
    ]);

    renderPage();

    await userEvent.click(await screen.findByText('Escola Azul'));

    expect(await screen.findByText('Turma A')).toBeInTheDocument();
    expect(screen.getByText('Profa. Ana')).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith('/metrics/admin/schools/s1/classrooms');
  });

  it('shows "sem professor definido" for a classroom without a titular teacher, never crashing (AC de 6.2)', async () => {
    mockedGet.mockResolvedValueOnce([
      {
        id: 's1',
        name: 'Escola Azul',
        classroomsCount: 1,
        teachersCount: 0,
        activeStudentsCount: 0,
        activeStudentsToday: 0,
      },
    ]);
    mockedGet.mockResolvedValueOnce([
      { id: 'c1', name: 'Turma sem professor', teacherDisplayName: null, activeStudentsCount: 0 },
    ]);

    renderPage();

    await userEvent.click(await screen.findByText('Escola Azul'));

    expect(await screen.findByText('sem professor definido')).toBeInTheDocument();
  });

  it('shows an empty state for a school with no classrooms yet, never an error (AC de 6.2)', async () => {
    mockedGet.mockResolvedValueOnce([
      {
        id: 's1',
        name: 'Escola Nova',
        classroomsCount: 0,
        teachersCount: 0,
        activeStudentsCount: 0,
        activeStudentsToday: 0,
      },
    ]);
    mockedGet.mockResolvedValueOnce([]);

    renderPage();

    await userEvent.click(await screen.findByText('Escola Nova'));

    expect(
      await screen.findByText('Nenhuma turma cadastrada ainda nesta escola.'),
    ).toBeInTheDocument();
  });
});
