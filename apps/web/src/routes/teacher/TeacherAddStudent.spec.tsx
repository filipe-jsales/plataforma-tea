import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { TeacherAddStudent } from './TeacherAddStudent';

vi.mock('../../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../lib/apiClient')>('../../lib/apiClient');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn() },
  };
});

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

const oneClassroom = [{ id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-1' }];
const twoClassrooms = [
  { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-1' },
  { id: 'classroom-2', name: 'Turma B', joinCode: 'AZUL-2' },
];
const avatars = [{ id: 'avatar-1', label: 'Gato', assetRef: 'avatar-cat' }];

function mockClassroomsAndAvatars(classrooms: typeof oneClassroom) {
  mockedGet.mockImplementation((path: string) => {
    if (path === '/home/teacher') return Promise.resolve(classrooms as any);
    if (path === '/illustrations?kind=avatar') return Promise.resolve(avatars as any);
    return Promise.resolve(undefined as any);
  });
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <TeacherAddStudent />
    </MemoryRouter>,
  );
}

describe('TeacherAddStudent', () => {
  it('AC — the form has no email/password/phone field for the student', async () => {
    mockClassroomsAndAvatars(oneClassroom);

    renderPage();
    await screen.findByLabelText(/nome do aluno/i);

    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/telefone/i)).not.toBeInTheDocument();
  });

  it('AC — hides the classroom selector when the teacher has only one classroom', async () => {
    mockClassroomsAndAvatars(oneClassroom);

    renderPage();
    await screen.findByLabelText(/nome do aluno/i);

    expect(screen.queryByText('Turma')).not.toBeInTheDocument();
  });

  it('shows the classroom selector when the teacher has more than one classroom', async () => {
    mockClassroomsAndAvatars(twoClassrooms);

    renderPage();
    await screen.findByLabelText(/nome do aluno/i);

    expect(await screen.findByText('Turma')).toBeInTheDocument();
  });

  it('creates the student and shows the generated credential card, never using the free-text name as part of it', async () => {
    mockClassroomsAndAvatars(oneClassroom);
    mockedPost.mockResolvedValueOnce({
      student: { id: 's1', displayName: 'Aluno Teste', pseudonymId: 'pseudo-1' },
      classroom: { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-1' },
      credential: {
        avatar: { label: 'Gato', assetRef: 'avatar-cat' },
        loginImages: [
          { label: 'Sol', assetRef: 'login-sun' },
          { label: 'Lua', assetRef: 'login-moon' },
          { label: 'Estrela', assetRef: 'login-star' },
        ],
      },
      duplicateWarning: false,
    });

    renderPage();
    await userEvent.type(await screen.findByLabelText(/nome do aluno/i), 'Aluno Teste');
    await userEvent.click(screen.getByRole('button', { name: /cadastrar aluno/i }));

    expect(await screen.findByText('Credencial de acesso')).toBeInTheDocument();
    expect(screen.getByAltText('Sol')).toBeInTheDocument();
    expect(screen.getByAltText('Lua')).toBeInTheDocument();
    expect(screen.getByAltText('Estrela')).toBeInTheDocument();
    expect(mockedPost).toHaveBeenCalledWith('/teacher/students', {
      displayName: 'Aluno Teste',
      classroomId: 'classroom-1',
    });
  });

  it('AC — shows a non-blocking info banner for a duplicate name, not an error, and still shows the credential', async () => {
    mockClassroomsAndAvatars(oneClassroom);
    mockedPost.mockResolvedValueOnce({
      student: { id: 's1', displayName: 'Aluno Teste', pseudonymId: 'pseudo-1' },
      classroom: { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-1' },
      credential: {
        avatar: { label: 'Gato', assetRef: 'avatar-cat' },
        loginImages: [
          { label: 'Sol', assetRef: 'login-sun' },
          { label: 'Lua', assetRef: 'login-moon' },
          { label: 'Estrela', assetRef: 'login-star' },
        ],
      },
      duplicateWarning: true,
    });

    renderPage();
    await userEvent.type(await screen.findByLabelText(/nome do aluno/i), 'Aluno Teste');
    await userEvent.click(screen.getByRole('button', { name: /cadastrar aluno/i }));

    expect(await screen.findByText(/já existe outro aluno com um nome parecido/i)).toBeInTheDocument();
    expect(screen.getByText('Credencial de acesso')).toBeInTheDocument();
  });
});
