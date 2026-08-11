import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('AdminHome — logout (1.5.1)', () => {
  it('clears the session and navigates to /login when "Sair" is clicked', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /sair/i }));

    expect(useAuthStore.getState().token).toBeNull();
    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });
});
