import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { AdminUsers } from './AdminUsers';

vi.mock('../../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../lib/apiClient')>('../../lib/apiClient');
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  };
});

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedPatch = vi.mocked(apiClient.patch);

const teacherUser = {
  id: 'u1',
  pseudonymId: 'p1',
  displayName: 'Prof. Ana',
  email: 'ana@escola.com',
  role: 'teacher' as const,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const studentUser = {
  id: 'u2',
  pseudonymId: 'p2',
  displayName: 'Aluno Um',
  email: null,
  role: 'student' as const,
  active: false,
  createdAt: '2026-01-02T00:00:00Z',
};

const activeStudentUser = { ...studentUser, id: 'u3', displayName: 'Aluno Dois', active: true };

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedPatch.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>,
  );
}

describe('AdminUsers', () => {
  it('lists users with role/status, never a delete action (no hard delete in the MVP)', async () => {
    mockedGet.mockResolvedValueOnce({ items: [teacherUser, studentUser], total: 2, page: 1, pageSize: 20 });

    renderPage();

    expect(await screen.findByText('Prof. Ana')).toBeInTheDocument();
    expect(screen.getByText('Aluno Um')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  it('shows Desativado/Ativo status, never only a color to convey it', async () => {
    mockedGet.mockResolvedValueOnce({ items: [studentUser], total: 1, page: 1, pageSize: 20 });

    renderPage();

    expect(await screen.findByText('Desativado')).toBeInTheDocument();
  });

  it('the create form has no student credential field, only name/email/role', async () => {
    mockedGet.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 });

    renderPage();
    await screen.findByText(/nenhum usuário encontrado/i);
    await userEvent.click(screen.getByRole('button', { name: /criar professor\/admin/i }));

    const dialog = await screen.findByRole('dialog', { name: /criar professor ou admin/i });
    expect(within(dialog).getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(within(dialog).queryByText(/avatar/i)).not.toBeInTheDocument();
  });

  it('shows the one-time password-setup link after creating a staff account', async () => {
    mockedGet.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 });
    mockedPost.mockResolvedValueOnce({
      user: { ...teacherUser, id: 'new-1' },
      passwordSetupToken: 'token-abc-123',
      totpOtpauthUri: null,
    });
    mockedGet.mockResolvedValueOnce({ items: [{ ...teacherUser, id: 'new-1' }], total: 1, page: 1, pageSize: 20 });

    renderPage();
    await screen.findByText(/nenhum usuário encontrado/i);
    await userEvent.click(screen.getByRole('button', { name: /criar professor\/admin/i }));
    const dialog = await screen.findByRole('dialog', { name: /criar professor ou admin/i });
    await userEvent.type(within(dialog).getByLabelText(/nome completo/i), 'Prof. Nova');
    await userEvent.type(within(dialog).getByLabelText(/e-mail/i), 'nova@escola.com');
    await userEvent.click(within(dialog).getByRole('button', { name: /^criar$/i }));

    expect(await screen.findByText('token-abc-123')).toBeInTheDocument();
    expect(mockedPost).toHaveBeenCalledWith('/admin/users', {
      displayName: 'Prof. Nova',
      email: 'nova@escola.com',
      role: 'teacher',
    });
  });

  it('editing a student never exposes email/role fields (credential follows flow 1.3)', async () => {
    mockedGet.mockResolvedValueOnce({ items: [studentUser], total: 1, page: 1, pageSize: 20 });

    renderPage();
    await screen.findByText('Aluno Um');
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));

    const dialog = await screen.findByRole('dialog', { name: /editar aluno um/i });
    expect(within(dialog).getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
  });

  it('deactivate/activate calls PATCH .../status and refreshes the list', async () => {
    mockedGet.mockResolvedValueOnce({ items: [teacherUser], total: 1, page: 1, pageSize: 20 });
    mockedPatch.mockResolvedValueOnce({ ...teacherUser, active: false });
    mockedGet.mockResolvedValueOnce({ items: [{ ...teacherUser, active: false }], total: 1, page: 1, pageSize: 20 });

    renderPage();
    await screen.findByText('Prof. Ana');
    await userEvent.click(screen.getByRole('button', { name: /desativar/i }));

    expect(mockedPatch).toHaveBeenCalledWith('/admin/users/u1/status', { active: false });
  });

  it('the "Consentimento" action only appears for student rows (A2, AC4)', async () => {
    mockedGet.mockResolvedValueOnce({ items: [teacherUser, studentUser], total: 2, page: 1, pageSize: 20 });

    renderPage();
    await screen.findByText('Prof. Ana');

    const rows = screen.getAllByRole('row');
    const teacherRow = rows.find((row) => within(row).queryByText('Prof. Ana'));
    const studentRow = rows.find((row) => within(row).queryByText('Aluno Um'));
    expect(teacherRow && within(teacherRow).queryByRole('button', { name: /consentimento/i })).toBeFalsy();
    expect(studentRow && within(studentRow).getByRole('button', { name: /consentimento/i })).toBeTruthy();
  });

  it('AC4 — shows a pending state when the guardian consent has not been registered yet', async () => {
    mockedGet.mockResolvedValueOnce({ items: [studentUser], total: 1, page: 1, pageSize: 20 });
    mockedGet.mockResolvedValueOnce({
      recorded: false,
      guardianName: null,
      guardianRelationship: null,
      guardianContact: null,
      consentedAt: null,
      collectedByDisplayName: null,
    });

    renderPage();
    await screen.findByText('Aluno Um');
    await userEvent.click(screen.getByRole('button', { name: /consentimento/i }));

    expect(mockedGet).toHaveBeenCalledWith('/admin/students/u2/guardian-consent');
    expect(await screen.findByText(/ainda não registrado/i)).toBeInTheDocument();
  });

  it('AC4 — shows when and by whom the consent was recorded', async () => {
    mockedGet.mockResolvedValueOnce({ items: [studentUser], total: 1, page: 1, pageSize: 20 });
    mockedGet.mockResolvedValueOnce({
      recorded: true,
      guardianName: 'Maria Silva',
      guardianRelationship: 'Mãe',
      guardianContact: '11999990000',
      consentedAt: '2026-01-05T12:00:00Z',
      collectedByDisplayName: 'Prof. Ana',
    });

    renderPage();
    await screen.findByText('Aluno Um');
    await userEvent.click(screen.getByRole('button', { name: /consentimento/i }));

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Mãe')).toBeInTheDocument();
    expect(screen.getByText('11999990000')).toBeInTheDocument();
    expect(screen.getByText('Prof. Ana')).toBeInTheDocument();
  });

  it('1.3 — "Recuperar acesso" only appears for ACTIVE student rows (no credential to reset otherwise)', async () => {
    mockedGet.mockResolvedValueOnce({ items: [studentUser, activeStudentUser], total: 2, page: 1, pageSize: 20 });

    renderPage();
    await screen.findByText('Aluno Dois');

    const rows = screen.getAllByRole('row');
    const pendingRow = rows.find((row) => within(row).queryByText('Aluno Um'));
    const activeRow = rows.find((row) => within(row).queryByText('Aluno Dois'));
    expect(pendingRow && within(pendingRow).queryByRole('button', { name: /recuperar acesso/i })).toBeFalsy();
    expect(activeRow && within(activeRow).getByRole('button', { name: /recuperar acesso/i })).toBeTruthy();
  });

  it('1.3 — resets the credential via POST /teacher/students/:id/reset-credential and shows the new sequence', async () => {
    mockedGet.mockResolvedValueOnce({ items: [activeStudentUser], total: 1, page: 1, pageSize: 20 });
    mockedPost.mockResolvedValueOnce({
      student: { id: 'u3', displayName: 'Aluno Dois', pseudonymId: 'p3' },
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
    await screen.findByText('Aluno Dois');
    await userEvent.click(screen.getByRole('button', { name: /recuperar acesso/i }));

    const dialog = await screen.findByRole('dialog', { name: /recuperar acesso — aluno dois/i });
    await userEvent.click(within(dialog).getByRole('button', { name: /gerar nova credencial/i }));

    expect(mockedPost).toHaveBeenCalledWith('/teacher/students/u3/reset-credential', {});
    expect(await within(dialog).findByText(/nova credencial gerada/i)).toBeInTheDocument();
  });
});
