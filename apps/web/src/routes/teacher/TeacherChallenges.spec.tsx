import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { TeacherChallenges } from './TeacherChallenges';

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedDelete = vi.mocked(apiClient.delete);

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedDelete.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <TeacherChallenges />
    </MemoryRouter>,
  );
}

describe('TeacherChallenges', () => {
  it('AC5 — shows only the templates/challenges the teacher created, never the seeded curriculum', async () => {
    mockedGet.mockResolvedValueOnce([
      { id: 'c1', title: 'Hexágonos', templateName: 'Desenhar um polígono regular', templateIcon: '🔷', createdAt: '2026-01-01' },
    ]);

    renderPage();

    expect(await screen.findByText('Hexágonos')).toBeInTheDocument();
    expect(screen.getByText(/desenhar um polígono regular/i)).toBeInTheDocument();
  });

  it('shows an empty-state message, not an error, when the teacher has no challenges yet', async () => {
    mockedGet.mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText(/você ainda não criou nenhum desafio/i)).toBeInTheDocument();
  });

  it('AC5 — edit and duplicate link into the same guided form, never a raw editor route', async () => {
    mockedGet.mockResolvedValueOnce([
      { id: 'c1', title: 'Hexágonos', templateName: 'Desenhar um polígono regular', templateIcon: '🔷', createdAt: '2026-01-01' },
    ]);

    renderPage();
    await screen.findByText('Hexágonos');

    expect(screen.getByRole('link', { name: /editar/i })).toHaveAttribute('href', '/teacher/challenges/c1/edit');
    expect(screen.getByRole('link', { name: /duplicar/i })).toHaveAttribute(
      'href',
      '/teacher/challenges/new?fromChallengeId=c1',
    );
  });

  it('asks for confirmation before deleting, never deletes on a single click', async () => {
    mockedGet.mockResolvedValueOnce([
      { id: 'c1', title: 'Hexágonos', templateName: 'Desenhar um polígono regular', templateIcon: '🔷', createdAt: '2026-01-01' },
    ]);

    renderPage();
    await screen.findByText('Hexágonos');
    await userEvent.click(screen.getByRole('button', { name: /excluir/i }));

    expect(screen.getByRole('dialog', { name: /excluir este desafio/i })).toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('deletes only after the confirmation dialog is accepted, then refreshes the list', async () => {
    mockedGet.mockResolvedValueOnce([
      { id: 'c1', title: 'Hexágonos', templateName: 'Desenhar um polígono regular', templateIcon: '🔷', createdAt: '2026-01-01' },
    ]);
    mockedDelete.mockResolvedValueOnce(undefined);
    mockedGet.mockResolvedValueOnce([]);

    renderPage();
    await screen.findByText('Hexágonos');
    await userEvent.click(screen.getByRole('button', { name: /excluir/i }));
    await userEvent.click(screen.getByRole('button', { name: /excluir mesmo assim/i }));

    expect(mockedDelete).toHaveBeenCalledWith('/teacher/challenges/c1');
    expect(await screen.findByText(/você ainda não criou nenhum desafio/i)).toBeInTheDocument();
  });

  it('4.3 — opens the allocation dialog for the selected challenge', async () => {
    mockedGet.mockResolvedValueOnce([
      { id: 'c1', title: 'Hexágonos', templateName: 'Desenhar um polígono regular', templateIcon: '🔷', createdAt: '2026-01-01' },
    ]);
    mockedGet.mockResolvedValueOnce([{ id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-1' }]);
    mockedGet.mockResolvedValueOnce([]);

    renderPage();
    await screen.findByText('Hexágonos');
    await userEvent.click(screen.getByRole('button', { name: /alocar à turma/i }));

    expect(await screen.findByRole('dialog', { name: /alocar à turma/i })).toBeInTheDocument();
    expect(screen.getByText(/"Hexágonos"/)).toBeInTheDocument();
  });
});
