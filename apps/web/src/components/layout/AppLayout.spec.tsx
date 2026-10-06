import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSidebarStore } from '../../stores/useSidebarStore';
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

const teacherUser = { ...studentUser, id: 'user-2', role: 'teacher' as const, displayName: 'Prof. Ana' };

beforeEach(() => {
  useAuthStore.setState({ token: 'token', user: studentUser });
  useSidebarStore.setState({ collapsed: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubDesktop(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
}

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

    await userEvent.click(screen.getByRole('button', { name: /abrir menu/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /configurações/i })).toBeInTheDocument();
  });
});

describe('AppLayout - desktop (>= 1024px)', () => {
  beforeEach(() => {
    stubDesktop(true);
    useAuthStore.setState({ token: 'token', user: teacherUser });
  });

  it('shows the sidebar fixed next to the content, with no dialog or overlay', () => {
    renderLayout();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /menu principal/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /meus alunos/i })).toBeInTheDocument();
    expect(screen.getByText('Conteúdo da página')).toBeInTheDocument();
  });

  it('the hamburger toggles between expanded and compact, keeping names reachable in compact mode', async () => {
    renderLayout();
    const toggle = screen.getByRole('button', { name: /recolher menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('.app-sidebar--compact')).toBeNull();

    await userEvent.click(toggle);

    const expand = screen.getByRole('button', { name: /expandir menu/i });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('.app-sidebar--compact')).not.toBeNull();
    // Texto continua no DOM (nome acessível), nunca só ícone.
    expect(screen.getByRole('link', { name: /meus alunos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it('starts compact when the saved preference says so', () => {
    useSidebarStore.setState({ collapsed: true });
    renderLayout();
    expect(document.querySelector('.app-sidebar--compact')).not.toBeNull();
  });
});

describe('AppLayout - mobile and tablet (< 1024px)', () => {
  it('does not render the fixed sidebar, only the drawer on demand', () => {
    stubDesktop(false);
    renderLayout();

    expect(screen.queryByRole('navigation', { name: /menu principal/i })).not.toBeInTheDocument();
    expect(document.querySelector('.app-sidebar-desktop')).toBeNull();
  });
});
