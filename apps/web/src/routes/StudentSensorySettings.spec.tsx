import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../stores/useAuthStore';
import { useSensoryProfileStore } from '../stores/useSensoryProfileStore';
import { StudentSensorySettings } from './StudentSensorySettings';

vi.mock('../lib/apiClient', () => ({ apiClient: { patch: vi.fn() } }));
vi.mock('../lib/logEvent', () => ({ logEvent: vi.fn() }));

const mockedPatch = vi.mocked(apiClient.patch);

const studentUser = {
  id: 'user-1',
  pseudonymId: 'pseudo-1',
  role: 'student' as const,
  displayName: 'Aluno Um',
  avatar: null,
  soundEnabled: false,
  animationEnabled: true,
  sensoryOnboardingCompletedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  mockedPatch.mockReset();
  useAuthStore.setState({ token: 'token', user: studentUser });
  useSensoryProfileStore.setState({ motionEnabled: false, soundEnabled: false, highContrast: false });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <StudentSensorySettings />
    </MemoryRouter>,
  );
}

describe('StudentSensorySettings (3.9)', () => {
  it('pre-fills the toggles with the current sensory profile, never forcing a re-onboard from scratch', () => {
    renderPage();

    expect(screen.getByRole('switch', { name: /quer som\?/i })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /quer animação\?/i })).toBeChecked();
  });

  it('saves the updated profile via PATCH /users/:id/sensory-profile, same endpoint the onboarding uses', async () => {
    mockedPatch.mockResolvedValueOnce({ ...studentUser, soundEnabled: true });

    renderPage();
    await userEvent.click(screen.getByRole('switch', { name: /quer som\?/i }));
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    expect(mockedPatch).toHaveBeenCalledWith('/users/user-1/sensory-profile', {
      soundEnabled: true,
      animationEnabled: true,
    });
    expect(await screen.findByText('Salvo.')).toBeInTheDocument();
  });

  it('applies the saved preferences to the live sensory theme immediately, no reload required', async () => {
    mockedPatch.mockResolvedValueOnce({ ...studentUser, soundEnabled: true, animationEnabled: false });

    renderPage();
    await userEvent.click(screen.getByRole('switch', { name: /quer som\?/i }));
    await userEvent.click(screen.getByRole('switch', { name: /quer animação\?/i }));
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await screen.findByText('Salvo.');
    expect(useSensoryProfileStore.getState().soundEnabled).toBe(true);
    expect(useSensoryProfileStore.getState().motionEnabled).toBe(false);
  });
});
