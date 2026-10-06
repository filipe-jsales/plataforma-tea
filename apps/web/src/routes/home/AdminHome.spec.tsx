import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../stores/useAuthStore';
import { AdminHome } from './AdminHome';

vi.mock('../../lib/apiClient', () => ({ apiClient: { get: vi.fn() } }));

const mockedGet = vi.mocked(apiClient.get);

const adminUser = {
  id: 'user-1',
  pseudonymId: 'pseudo-1',
  role: 'admin' as const,
  displayName: 'Admin Demo',
  avatar: null,
  soundEnabled: false,
  animationEnabled: false,
  sensoryOnboardingCompletedAt: null,
};

beforeEach(() => {
  mockedGet.mockReset().mockResolvedValue({ schoolsCount: 0, classroomsCount: 0, usersCount: 0 });
  useAuthStore.setState({ token: 'token', user: adminUser });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<AdminHome />} />
        <Route path="/login" element={<p>Tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

// 1.5.1 - "Sair" saiu desta tela e foi pra AppSidebar (ver
// components/layout/AppSidebar.spec.tsx) - cobertura de logout vive lá.
describe('AdminHome', () => {
  it('greets the admin by display name', async () => {
    renderPage();

    expect(await screen.findByText('Olá, Admin Demo!')).toBeInTheDocument();
  });

  it('no longer renders its own "Sair" button (moved to the global sidebar)', async () => {
    renderPage();

    await screen.findByText('Olá, Admin Demo!');
    expect(screen.queryByRole('button', { name: /sair/i })).not.toBeInTheDocument();
  });

  it('still links to /admin/settings ("Configurações") from its own action grid', async () => {
    renderPage();

    const link = await screen.findByRole('link', { name: /configurações/i });
    expect(link).toHaveAttribute('href', '/admin/settings');
  });
});
