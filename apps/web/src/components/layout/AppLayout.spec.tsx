import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../stores/useAuthStore';
import { AppLayout } from './AppLayout';

vi.mock('../../lib/logEvent', () => ({ logEvent: vi.fn() }));

const studentUser = {
  id: 'user-1',
  pseudonymId: 'pseudo-1',
  role: 'student' as const,
  displayName: 'Aluno Um',
  avatar: null,
  soundEnabled: false,
  animationEnabled: false,
  sensoryOnboardingCompletedAt: '2026-01-01',
};

beforeEach(() => {
  useAuthStore.setState({ token: 'token', user: studentUser });
});

function renderLayout() {
  return render(
    <MemoryRouter>
      <AppLayout>
        <p>Conteúdo da página</p>
      </AppLayout>
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  it('renders the page content, a footer with contact/rights, and the sidebar closed by default', () => {
    renderLayout();

    expect(screen.getByText('Conteúdo da página')).toBeInTheDocument();
    expect(screen.getByText(/todos os direitos reservados/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the sidebar when the header hamburger ("Menu") is clicked', async () => {
    renderLayout();

    await userEvent.click(screen.getByRole('button', { name: /menu/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /configurações/i })).toBeInTheDocument();
  });
});
