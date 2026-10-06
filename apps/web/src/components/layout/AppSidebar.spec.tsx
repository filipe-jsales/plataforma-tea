import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../stores/useAuthStore';
import { AppSidebar } from './AppSidebar';

vi.mock('../../lib/logEvent', () => ({ logEvent: vi.fn() }));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

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
const adminUser = { ...studentUser, id: 'user-3', role: 'admin' as const, displayName: 'Admin Demo' };

beforeEach(() => {
  navigateMock.mockReset();
  useAuthStore.setState({ token: null, user: null });
});

function renderSidebar(open = true) {
  const onOpenChange = vi.fn();
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<AppSidebar open={open} onOpenChange={onOpenChange} />} />
      </Routes>
    </MemoryRouter>,
  );
  return { onOpenChange };
}

describe('AppSidebar - sem sessão', () => {
  it('renders nothing when there is no logged-in user', () => {
    renderSidebar();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('AppSidebar - visão de aluno', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'token', user: studentUser });
  });

  it('offers a link to revisit sensory settings', async () => {
    renderSidebar();
    const settingsLink = await screen.findByRole('link', { name: /configurações/i });
    expect(settingsLink).toHaveAttribute('href', '/settings/sensory');
  });

  it('the "Matérias" group starts collapsed - no category link visible before expanding', () => {
    renderSidebar();
    expect(screen.queryByRole('link', { name: /informática na computação/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /educação em computação/i })).not.toBeInTheDocument();
  });

  it('expanding "Matérias" reveals both renamed categories, both pointing to /subjects', async () => {
    renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: /matérias/i }));

    expect(await screen.findByRole('link', { name: /informática na computação/i })).toHaveAttribute(
      'href',
      '/subjects',
    );
    expect(screen.getByRole('link', { name: /educação em computação/i })).toHaveAttribute('href', '/subjects');
  });

  it('never shows the teacher-only navigation', () => {
    renderSidebar();
    expect(screen.queryByRole('link', { name: /adicionar aluno/i })).not.toBeInTheDocument();
  });
});

describe('AppSidebar - visão de professor', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'token', user: teacherUser });
  });

  it('lists every teacher navigation item requested', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: /adicionar aluno/i })).toHaveAttribute(
      'href',
      '/teacher/students/new',
    );
    expect(screen.getByRole('link', { name: /meus alunos/i })).toHaveAttribute('href', '/teacher/students');
    expect(screen.getByRole('link', { name: /painel da turma/i })).toHaveAttribute('href', '/teacher/metrics');
    expect(screen.getByRole('link', { name: /meus desafios/i })).toHaveAttribute('href', '/teacher/challenges');
    expect(screen.getByRole('link', { name: /mini jogo/i })).toHaveAttribute(
      'href',
      '/teacher/minigames',
    );
  });

  it('never shows the student-only "Matérias" group', () => {
    renderSidebar();
    expect(screen.queryByRole('button', { name: /matérias/i })).not.toBeInTheDocument();
  });
});

describe('AppSidebar - visão de admin', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'token', user: adminUser });
  });

  it('offers a link to /admin/settings labelled "Configurações"', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /configurações/i })).toHaveAttribute('href', '/admin/settings');
  });
});

describe('AppSidebar - "Sair" (1.5.1)', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'token', user: studentUser });
  });

  it('is present in every role, always as the last control in the sidebar', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
  });

  it('clears the session, closes the sidebar and navigates to /login when clicked', async () => {
    const { onOpenChange } = renderSidebar();

    await userEvent.click(screen.getByRole('button', { name: /sair/i }));

    expect(useAuthStore.getState().token).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
  });
});

describe('AppSidebar - fechar', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'token', user: studentUser });
  });

  it('the close control is an icon-only button but always has an accessible name', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when the close button is clicked', async () => {
    const { onOpenChange } = renderSidebar();
    await userEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('AppSidebar - item ativo', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'token', user: teacherUser });
  });

  function renderAt(path: string) {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppSidebar open onOpenChange={vi.fn()} />
      </MemoryRouter>,
    );
  }

  it('marks only the item that matches the current route with aria-current="page"', () => {
    renderAt('/teacher/metrics');
    expect(screen.getByRole('link', { name: /painel da turma/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /meus alunos/i })).not.toHaveAttribute('aria-current');
  });

  it('prefers the most specific match (/teacher/students/new is not also "Meus alunos")', () => {
    renderAt('/teacher/students/new');
    expect(screen.getByRole('link', { name: /adicionar aluno/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /meus alunos/i })).not.toHaveAttribute('aria-current');
  });
});
