import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { TeacherStudents } from './TeacherStudents';

vi.mock('../../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../lib/apiClient')>('../../lib/apiClient');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn() },
  };
});

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

const twoClassrooms = [
  { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-1' },
  { id: 'classroom-2', name: 'Turma B', joinCode: 'AZUL-2' },
];
const roster = [
  { id: 'student-1', displayName: 'Aluno Um', avatar: { label: 'Gato', assetRef: 'avatar-cat' }, enrolledAt: '2026-01-01T00:00:00Z' },
];

function mockClassroomsAndRoster() {
  mockedGet.mockImplementation((path: string) => {
    if (path === '/home/teacher') return Promise.resolve(twoClassrooms as any);
    if (path === '/teacher/classrooms/classroom-1/students') return Promise.resolve(roster as any);
    return Promise.resolve([] as any);
  });
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <TeacherStudents />
    </MemoryRouter>,
  );
}

describe('TeacherStudents', () => {
  it('lists the roster of the (first) classroom', async () => {
    mockClassroomsAndRoster();

    renderPage();

    expect(await screen.findByText('Aluno Um')).toBeInTheDocument();
  });

  it('opens a transfer dialog offering only OTHER classrooms, never the current one', async () => {
    mockClassroomsAndRoster();

    renderPage();
    await screen.findByText('Aluno Um');
    await userEvent.click(screen.getByRole('button', { name: /transferir de turma/i }));

    const dialog = await screen.findByRole('dialog', { name: /transferir aluno um/i });
    await userEvent.click(within(dialog).getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Turma B' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Turma A' })).not.toBeInTheDocument();
  });

  it('submits the transfer to the enrollments endpoint and refreshes the roster', async () => {
    mockClassroomsAndRoster();
    mockedPost.mockResolvedValueOnce({
      studentId: 'student-1',
      previousClassroomId: 'classroom-1',
      newClassroom: { id: 'classroom-2', name: 'Turma B', joinCode: 'AZUL-2' },
    });

    renderPage();
    await screen.findByText('Aluno Um');
    await userEvent.click(screen.getByRole('button', { name: /transferir de turma/i }));
    const dialog = await screen.findByRole('dialog', { name: /transferir aluno um/i });
    await userEvent.click(within(dialog).getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Turma B' }));
    await userEvent.click(within(dialog).getByRole('button', { name: /confirmar transferência/i }));

    expect(mockedPost).toHaveBeenCalledWith('/teacher/students/student-1/enrollments', {
      classroomId: 'classroom-2',
    });
  });

  it('1.3 — generates a new credential via reset-credential and shows the new image sequence', async () => {
    mockClassroomsAndRoster();
    mockedPost.mockResolvedValueOnce({
      student: { id: 'student-1', displayName: 'Aluno Um', pseudonymId: 'pseudo-1' },
      classroom: { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-1' },
      credential: {
        avatar: { label: 'Gato', assetRef: 'avatar-cat' },
        loginImages: [
          { label: 'Sol', assetRef: 'sol.svg' },
          { label: 'Lua', assetRef: 'lua.svg' },
          { label: 'Estrela', assetRef: 'estrela.svg' },
        ],
      },
    });

    renderPage();
    await screen.findByText('Aluno Um');
    await userEvent.click(screen.getByRole('button', { name: /recuperar acesso/i }));

    const dialog = await screen.findByRole('dialog', { name: /recuperar acesso — aluno um/i });
    await userEvent.click(within(dialog).getByRole('button', { name: /gerar nova credencial/i }));

    expect(mockedPost).toHaveBeenCalledWith('/teacher/students/student-1/reset-credential', {});
    expect(await within(dialog).findByText(/nova credencial gerada/i)).toBeInTheDocument();
  });
});
