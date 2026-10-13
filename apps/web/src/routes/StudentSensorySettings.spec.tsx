import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../stores/useAuthStore';
import { useReadingPrefsStore } from '../stores/useReadingPrefsStore';
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

describe('StudentSensorySettings - leitura (F15/F16)', () => {
  beforeEach(() => {
    useReadingPrefsStore.setState({ fontScale: 'normal', readAloudEnabled: false });
    document.documentElement.removeAttribute('data-font-scale');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, 'speechSynthesis');
  });

  function supportSpeech() {
    vi.stubGlobal('SpeechSynthesisUtterance', class {});
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: vi.fn(), cancel: vi.fn() },
    });
  }

  it('offers three named text sizes, with the current one (normal) selected', () => {
    renderPage();

    expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Grande' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Muito grande' })).not.toBeChecked();
  });

  it('F15 - applies the chosen text size right away, without pressing Salvar and without any API call', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: 'Grande' }));

    expect(useReadingPrefsStore.getState().fontScale).toBe('large');
    expect(document.documentElement.dataset.fontScale).toBe('large');
    expect(mockedPatch).not.toHaveBeenCalled();
  });

  it('F16 - shows the read-aloud switch, off by default, only when the browser can speak', async () => {
    supportSpeech();
    renderPage();

    const toggle = screen.getByRole('switch', { name: /quer ouvir o enunciado\?/i });
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);

    expect(useReadingPrefsStore.getState().readAloudEnabled).toBe(true);
  });

  it('F16 - hides the read-aloud switch when the browser has no speech support, instead of offering something that cannot work', () => {
    renderPage();

    expect(screen.queryByRole('switch', { name: /ouvir o enunciado/i })).not.toBeInTheDocument();
  });

  it('says plainly that these two choices only apply to this computer', () => {
    renderPage();

    expect(screen.getByText(/valem só neste computador/i)).toBeInTheDocument();
  });
});
