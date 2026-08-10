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

const pendingStudent = {
  student: { id: 'student-1', displayName: 'Aluno Teste', pseudonymId: 'pseudo-1' },
  classroom: { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-1' },
  avatar: { label: 'Gato', assetRef: 'avatar-cat' },
  duplicateWarning: false,
};

const credential = {
  student: { id: 'student-1', displayName: 'Aluno Teste', pseudonymId: 'pseudo-1' },
  classroom: { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-1' },
  credential: {
    avatar: { label: 'Gato', assetRef: 'avatar-cat' },
    loginImages: [
      { label: 'Sol', assetRef: 'login-sun' },
      { label: 'Lua', assetRef: 'login-moon' },
      { label: 'Estrela', assetRef: 'login-star' },
    ],
  },
};

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

async function fillAndSubmitStudentStep() {
  await userEvent.type(await screen.findByLabelText(/nome do aluno/i), 'Aluno Teste');
  await userEvent.click(screen.getByRole('button', { name: /continuar/i }));
}

describe('TeacherAddStudent — passo 1 (dados do aluno)', () => {
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

  it('A2 — creates only a PENDING account, never a credential, at this step', async () => {
    mockClassroomsAndAvatars(oneClassroom);
    mockedPost.mockResolvedValueOnce(pendingStudent);

    renderPage();
    await fillAndSubmitStudentStep();

    expect(mockedPost).toHaveBeenCalledWith('/teacher/students', {
      displayName: 'Aluno Teste',
      classroomId: 'classroom-1',
    });
    expect(screen.queryByText('Credencial de acesso')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /responsável legal/i })).toBeInTheDocument();
  });
});

describe('TeacherAddStudent — passo 2 (responsável legal, A2)', () => {
  beforeEach(() => {
    mockClassroomsAndAvatars(oneClassroom);
    mockedPost.mockResolvedValueOnce(pendingStudent);
  });

  it('AC1/AC2 — blocks continuing without an explicit consent confirmation', async () => {
    renderPage();
    await fillAndSubmitStudentStep();

    await userEvent.type(await screen.findByLabelText(/nome do responsável/i), 'Maria Silva');
    await userEvent.type(screen.getByLabelText(/vínculo com o aluno/i), 'Mãe');
    await userEvent.type(screen.getByLabelText(/contato do responsável/i), '11999990000');
    await userEvent.click(screen.getByRole('button', { name: /registrar consentimento/i }));

    expect(
      await screen.findByText(/necessário confirmar o consentimento/i),
    ).toBeInTheDocument();
    expect(mockedPost).toHaveBeenCalledTimes(1); // só o passo 1, nunca o passo 2
  });

  it('AC2 — registers the consent (with explicit accept) and only then receives the credential', async () => {
    mockedPost.mockResolvedValueOnce(credential);

    renderPage();
    await fillAndSubmitStudentStep();

    await userEvent.type(await screen.findByLabelText(/nome do responsável/i), 'Maria Silva');
    await userEvent.type(screen.getByLabelText(/vínculo com o aluno/i), 'Mãe');
    await userEvent.type(screen.getByLabelText(/contato do responsável/i), '11999990000');
    await userEvent.click(screen.getByRole('switch'));
    await userEvent.click(screen.getByRole('button', { name: /registrar consentimento/i }));

    expect(mockedPost).toHaveBeenNthCalledWith(2, '/teacher/students/student-1/guardian-consent', {
      guardianName: 'Maria Silva',
      guardianRelationship: 'Mãe',
      guardianContact: '11999990000',
      consentAccepted: true,
    });
    expect(await screen.findByText('Credencial de acesso')).toBeInTheDocument();
  });
});

describe('TeacherAddStudent — passo 3 (credencial)', () => {
  it('shows the generated credential card, never using the free-text name as part of it', async () => {
    mockClassroomsAndAvatars(oneClassroom);
    mockedPost.mockResolvedValueOnce(pendingStudent);
    mockedPost.mockResolvedValueOnce(credential);

    renderPage();
    await fillAndSubmitStudentStep();
    await userEvent.type(await screen.findByLabelText(/nome do responsável/i), 'Maria Silva');
    await userEvent.type(screen.getByLabelText(/vínculo com o aluno/i), 'Mãe');
    await userEvent.type(screen.getByLabelText(/contato do responsável/i), '11999990000');
    await userEvent.click(screen.getByRole('switch'));
    await userEvent.click(screen.getByRole('button', { name: /registrar consentimento/i }));

    expect(await screen.findByText('Credencial de acesso')).toBeInTheDocument();
    expect(screen.getByAltText('Sol')).toBeInTheDocument();
    expect(screen.getByAltText('Lua')).toBeInTheDocument();
    expect(screen.getByAltText('Estrela')).toBeInTheDocument();
  });

  it('AC — shows a non-blocking info banner for a duplicate name at the credential step, not an error', async () => {
    mockClassroomsAndAvatars(oneClassroom);
    mockedPost.mockResolvedValueOnce({ ...pendingStudent, duplicateWarning: true });
    mockedPost.mockResolvedValueOnce(credential);

    renderPage();
    await fillAndSubmitStudentStep();
    await userEvent.type(await screen.findByLabelText(/nome do responsável/i), 'Maria Silva');
    await userEvent.type(screen.getByLabelText(/vínculo com o aluno/i), 'Mãe');
    await userEvent.type(screen.getByLabelText(/contato do responsável/i), '11999990000');
    await userEvent.click(screen.getByRole('switch'));
    await userEvent.click(screen.getByRole('button', { name: /registrar consentimento/i }));

    expect(await screen.findByText(/já existe outro aluno com um nome parecido/i)).toBeInTheDocument();
    expect(screen.getByText('Credencial de acesso')).toBeInTheDocument();
  });
});
