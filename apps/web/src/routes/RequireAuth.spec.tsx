import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../stores/useAuthStore';
import { RequireAuth } from './RequireAuth';

function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

const validToken = makeToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 });
const expiredToken = makeToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 3600 });

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
  useAuthStore.setState({ token: null, user: null });
});

function renderGuarded(roles?: ('student' | 'teacher' | 'admin')[]) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <RequireAuth roles={roles}>
              <p>Conteúdo protegido</p>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<p>Tela de login</p>} />
        <Route path="/home" element={<p>Home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('redirects to /login when there is no session at all', async () => {
    renderGuarded();

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });

  it('renders the protected content when the session token is valid and not expired', async () => {
    useAuthStore.setState({ token: validToken, user: studentUser });

    renderGuarded();

    expect(await screen.findByText('Conteúdo protegido')).toBeInTheDocument();
  });

  it('1.5.1 — redirects to /login and clears the session when the token is expired', async () => {
    useAuthStore.setState({ token: expiredToken, user: studentUser });

    renderGuarded();

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('redirects to /home when the role does not match, never a generic error screen', async () => {
    useAuthStore.setState({ token: validToken, user: studentUser });

    renderGuarded(['admin']);

    expect(await screen.findByText('Home')).toBeInTheDocument();
  });
});
