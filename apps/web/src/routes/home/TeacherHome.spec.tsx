import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../stores/useAuthStore';
import { TeacherHome } from './TeacherHome';

vi.mock('../../lib/apiClient', () => ({ apiClient: { get: vi.fn() } }));

const mockedGet = vi.mocked(apiClient.get);

const teacherUser = {
  id: 'user-1',
  pseudonymId: 'pseudo-1',
  role: 'teacher' as const,
  displayName: 'Prof. Ana',
  avatar: null,
  soundEnabled: false,
  animationEnabled: false,
  sensoryOnboardingCompletedAt: null,
};

beforeEach(() => {
  mockedGet.mockReset().mockResolvedValue([]);
  useAuthStore.setState({ token: 'token', user: teacherUser });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<TeacherHome />} />
        <Route path="/login" element={<p>Tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

// 1.5.1 - "Sair" saiu desta tela e foi pra AppSidebar (ver
// components/layout/AppSidebar.spec.tsx) - cobertura de logout vive lá.
describe('TeacherHome', () => {
  it('greets the teacher by display name', async () => {
    renderPage();

    expect(await screen.findByText('Olá, Prof. Ana!')).toBeInTheDocument();
  });

  it('no longer renders its own "Sair" button (moved to the global sidebar)', async () => {
    renderPage();

    await screen.findByText('Olá, Prof. Ana!');
    expect(screen.queryByRole('button', { name: /sair/i })).not.toBeInTheDocument();
  });
});
