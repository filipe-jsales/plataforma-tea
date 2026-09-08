import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../stores/useAuthStore';
import { StudentHome } from './StudentHome';

vi.mock('../../lib/apiClient', () => ({ apiClient: { get: vi.fn() } }));
vi.mock('../../lib/logEvent', () => ({ logEvent: vi.fn() }));

const mockedGet = vi.mocked(apiClient.get);

const studentUser = {
  id: 'user-1',
  pseudonymId: 'pseudo-1',
  role: 'student' as const,
  displayName: 'Aluno Um',
  avatar: null,
  soundEnabled: false,
  animationEnabled: false,
  sensoryOnboardingCompletedAt: null,
};

beforeEach(() => {
  mockedGet.mockReset().mockResolvedValue({
    continueChallenge: null,
    progress: { completedChallengesCount: 0 },
    classComparison: null,
  });
  useAuthStore.setState({ token: 'token', user: studentUser });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<StudentHome />} />
        <Route path="/login" element={<p>Tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StudentHome — logout (1.5.1)', () => {
  it('"Sair" is outside the up-to-2-main-actions group, never one of them', async () => {
    renderPage();

    const logoutButton = await screen.findByRole('button', { name: /sair/i });
    expect(logoutButton).toBeInTheDocument();
  });

  it('clears the session and navigates to /login when clicked', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /sair/i }));

    expect(useAuthStore.getState().token).toBeNull();
    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });
});

describe('StudentHome — sensory settings link (3.9)', () => {
  it('offers a discreet, always-available link to revisit sensory settings', async () => {
    renderPage();

    const settingsLink = await screen.findByRole('link', { name: /configurações/i });
    expect(settingsLink).toHaveAttribute('href', '/settings/sensory');
  });
});

describe('StudentHome — class comparison (7.3)', () => {
  it('never shows a comparison when the teacher never enabled it (classComparison: null)', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /meu progresso/i }));

    expect(screen.queryByText(/entre os alunos que mais praticaram/i)).not.toBeInTheDocument();
  });

  it('shows an aggregate, anonymous message when enabled and the student is among the most active', async () => {
    mockedGet.mockReset().mockResolvedValue({
      continueChallenge: null,
      progress: { completedChallengesCount: 0 },
      classComparison: { amongMostActiveThisWeek: true },
    });

    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /meu progresso/i }));

    const comparison = await screen.findByText(/entre os alunos que mais praticaram/i);
    expect(comparison).toBeInTheDocument();
    // Never a name, avatar, or a colleague's number — text only.
    expect(comparison.textContent).not.toMatch(/\d/);
  });

  it('never shows the comparison text when the student is not among the most active', async () => {
    mockedGet.mockReset().mockResolvedValue({
      continueChallenge: null,
      progress: { completedChallengesCount: 0 },
      classComparison: { amongMostActiveThisWeek: false },
    });

    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /meu progresso/i }));

    expect(screen.queryByText(/entre os alunos que mais praticaram/i)).not.toBeInTheDocument();
  });
});
