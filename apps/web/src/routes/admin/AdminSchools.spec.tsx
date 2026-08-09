import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { AdminSchools } from './AdminSchools';

vi.mock('../../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../lib/apiClient')>('../../lib/apiClient');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  };
});

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedPatch = vi.mocked(apiClient.patch);

const activeSchool = {
  id: 's1',
  name: 'Escola Azul',
  externalId: 'INEP123',
  active: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
};

const inactiveSchool = {
  id: 's2',
  name: 'Escola Desativada',
  externalId: null,
  active: false,
  deletedAt: '2026-02-01T00:00:00Z',
  createdAt: '2026-01-02T00:00:00Z',
};

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedPatch.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminSchools />
    </MemoryRouter>,
  );
}

describe('AdminSchools', () => {
  it('lists schools with name/externalId/status, never a delete action (B1: soft delete only)', async () => {
    mockedGet.mockResolvedValueOnce([activeSchool, inactiveSchool]);

    renderPage();

    expect(await screen.findByText('Escola Azul')).toBeInTheDocument();
    expect(screen.getByText('INEP123')).toBeInTheDocument();
    expect(screen.getByText('Escola Desativada')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText('Desativada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  it('shows an empty state with zero schools, never an error', async () => {
    mockedGet.mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText('Nenhuma escola cadastrada ainda.')).toBeInTheDocument();
  });

  it('creating a school only requires a name (externalId is optional)', async () => {
    mockedGet.mockResolvedValueOnce([]);
    mockedPost.mockResolvedValueOnce({ ...activeSchool, id: 'new-1' });
    mockedGet.mockResolvedValueOnce([{ ...activeSchool, id: 'new-1' }]);

    renderPage();
    await screen.findByText(/nenhuma escola cadastrada/i);
    await userEvent.click(screen.getByRole('button', { name: /criar escola/i }));
    const dialog = await screen.findByRole('dialog', { name: /criar escola/i });
    await userEvent.type(screen.getByLabelText(/nome da escola/i), 'Escola Nova');
    await userEvent.click(within(dialog).getByRole('button', { name: /^criar$/i }));

    expect(mockedPost).toHaveBeenCalledWith('/admin/schools', {
      name: 'Escola Nova',
      externalId: undefined,
    });
  });

  it('deactivate/reactivate calls PATCH .../status and refreshes the list', async () => {
    mockedGet.mockResolvedValueOnce([activeSchool]);
    mockedPatch.mockResolvedValueOnce({ ...activeSchool, active: false });
    mockedGet.mockResolvedValueOnce([{ ...activeSchool, active: false }]);

    renderPage();
    await screen.findByText('Escola Azul');
    await userEvent.click(screen.getByRole('button', { name: /desativar/i }));

    expect(mockedPatch).toHaveBeenCalledWith('/admin/schools/s1/status', { active: false });
  });

  it('links to the classroom management screen of that school', async () => {
    mockedGet.mockResolvedValueOnce([activeSchool]);

    renderPage();

    const link = await screen.findByRole('link', { name: /turmas/i });
    expect(link).toHaveAttribute('href', '/admin/schools/s1/classrooms');
  });
});
