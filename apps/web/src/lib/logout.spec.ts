import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/useAuthStore';
import { logEvent } from './logEvent';
import { performLogout } from './logout';

vi.mock('./logEvent', () => ({ logEvent: vi.fn() }));

const mockedLogEvent = vi.mocked(logEvent);

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

const teacherUser = { ...studentUser, id: 'user-2', role: 'teacher' as const, displayName: 'Prof. Ana' };

beforeEach(() => {
  mockedLogEvent.mockReset();
  useAuthStore.setState({ token: 'token', user: studentUser });
});

describe('performLogout', () => {
  it('clears the session for any role', () => {
    performLogout(studentUser);

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('logs a logout (RD-L) event only for a student', () => {
    performLogout(studentUser);

    expect(mockedLogEvent).toHaveBeenCalledWith({
      studentPseudoId: 'pseudo-1',
      category: 'RD-L',
      type: 'logout',
    });
  });

  it('never logs an event for teacher/admin logout (RD-* is scoped to students, see backend.md)', () => {
    performLogout(teacherUser);

    expect(mockedLogEvent).not.toHaveBeenCalled();
  });
});
