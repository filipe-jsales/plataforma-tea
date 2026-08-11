import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../stores/useAuthStore';
import { SubjectSelector } from './SubjectSelector';

vi.mock('../lib/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));
vi.mock('../lib/logEvent', () => ({
  logEvent: vi.fn(),
}));

const mockedGet = vi.mocked(apiClient.get);

const testUser = {
  id: 'student-1',
  pseudonymId: 'pseudo-1',
  role: 'student' as const,
  displayName: 'Aluno(a) Demo',
  avatar: null,
  soundEnabled: false,
  animationEnabled: false,
  sensoryOnboardingCompletedAt: '2026-01-01',
};

beforeEach(() => {
  mockedGet.mockReset();
  useAuthStore.setState({ token: 'token', user: testUser });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SubjectSelector />
    </MemoryRouter>,
  );
}

describe('SubjectSelector', () => {
  it('renders the curricular modules from /subjects/topics', async () => {
    mockedGet.mockResolvedValueOnce([{ topicId: 't1', subjectId: 's1', name: 'Ângulos e formas' }]);
    mockedGet.mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText('Ângulos e formas')).toBeInTheDocument();
  });

  it('4.3 — shows no "Desafios da sua turma" section when nothing was allocated (AC3), never an error', async () => {
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce([]);

    renderPage();
    await screen.findByText(/onde você quer entrar/i);

    expect(screen.queryByText('Desafios da sua turma')).not.toBeInTheDocument();
  });

  it('4.3 (AC2/AC4) — lists a teacher-allocated challenge as a direct link into it', async () => {
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce([
      { id: 'challenge-1', title: 'Hexágonos', prompt: 'Monte um desenho com 6 lados.', isNew: false },
    ]);

    renderPage();

    expect(await screen.findByText('Desafios da sua turma')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /hexágonos/i });
    expect(link).toHaveAttribute('href', '/challenge/challenge-1');
  });

  it('E1 (AC1) — shows a discreet "Novo" marker for a challenge the student has never opened', async () => {
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce([
      { id: 'challenge-1', title: 'Hexágonos', prompt: 'p', isNew: true },
    ]);

    renderPage();

    expect(await screen.findByText('Hexágonos')).toBeInTheDocument();
    expect(screen.getByText('Novo')).toBeInTheDocument();
  });

  it('E1 (AC2) — a challenge already opened by the student shows no marker', async () => {
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce([
      { id: 'challenge-1', title: 'Hexágonos', prompt: 'p', isNew: false },
    ]);

    renderPage();

    expect(await screen.findByText('Hexágonos')).toBeInTheDocument();
    expect(screen.queryByText('Novo')).not.toBeInTheDocument();
  });

  it('E1 (AC3) — multiple new challenges are each marked individually, never an aggregate count', async () => {
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce([
      { id: 'challenge-1', title: 'Hexágonos', prompt: 'p', isNew: true },
      { id: 'challenge-2', title: 'Triângulos', prompt: 'p', isNew: true },
      { id: 'challenge-3', title: 'Quadrados', prompt: 'p', isNew: true },
    ]);

    renderPage();

    expect(await screen.findAllByText('Novo')).toHaveLength(3);
    expect(screen.queryByText(/\d+ novos?/i)).not.toBeInTheDocument();
  });

  it('requires an explicit confirmation before navigating into a curricular module (AC2, previsibilidade)', async () => {
    mockedGet.mockResolvedValueOnce([{ topicId: 't1', subjectId: 's1', name: 'Ângulos e formas' }]);
    mockedGet.mockResolvedValueOnce([]);

    renderPage();
    const confirmButton = await screen.findByRole('button', { name: /confirmar/i });

    expect(confirmButton).toBeDisabled();
    await userEvent.click(await screen.findByText('Ângulos e formas'));
    expect(confirmButton).toBeEnabled();
  });
});
