import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('TeacherHome — logout (1.5.1)', () => {
  it('clears the session and navigates to /login when "Sair" is clicked', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /sair/i }));

    expect(useAuthStore.getState().token).toBeNull();
    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });
});
