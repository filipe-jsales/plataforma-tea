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
      { id: 'challenge-1', title: 'Hexágonos', prompt: 'Monte um desenho com 6 lados.' },
    ]);

    renderPage();

    expect(await screen.findByText('Desafios da sua turma')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /hexágonos/i });
    expect(link).toHaveAttribute('href', '/challenge/challenge-1');
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
