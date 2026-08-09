import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { AdminSchoolClassrooms } from './AdminSchoolClassrooms';

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

const activeSchool = {
  id: 's1',
  name: 'Escola Azul',
  externalId: null,
  active: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
};

const inactiveSchool = { ...activeSchool, active: false, deletedAt: '2026-02-01T00:00:00Z' };

const classroomWithTeacher = {
  id: 'c1',
  schoolId: 's1',
  name: 'Turma A',
  joinCode: 'AZUL-1',
  teacherId: 't1',
  teacherName: 'Prof. Ana',
  active: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
};

const teachersPage = {
  items: [{ id: 't1', pseudonymId: 'p1', displayName: 'Prof. Ana', email: 'ana@escola.com', role: 'teacher', active: true, createdAt: '2026-01-01T00:00:00Z' }],
  total: 1,
  page: 1,
  pageSize: 200,
};

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedPatch.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/schools/s1/classrooms']}>
      <Routes>
        <Route path="/admin/schools/:schoolId/classrooms" element={<AdminSchoolClassrooms />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminSchoolClassrooms', () => {
  it('shows the school name in the heading and lists its classrooms with the responsible teacher', async () => {
    mockedGet.mockResolvedValueOnce(activeSchool); // GET /admin/schools/s1
    mockedGet.mockResolvedValueOnce([classroomWithTeacher]); // GET .../classrooms
    mockedGet.mockResolvedValueOnce(teachersPage); // GET /admin/users?role=teacher...

    renderPage();

    expect(await screen.findByRole('heading', { name: /turmas — escola azul/i })).toBeInTheDocument();
    expect(await screen.findByText('Turma A')).toBeInTheDocument();
    expect(screen.getByText('AZUL-1')).toBeInTheDocument();
    expect(screen.getByText('Prof. Ana')).toBeInTheDocument();
  });

  it('shows an em dash for a classroom with no teacher assigned yet, never crashing', async () => {
    mockedGet.mockResolvedValueOnce(activeSchool);
    mockedGet.mockResolvedValueOnce([{ ...classroomWithTeacher, teacherId: null, teacherName: null }]);
    mockedGet.mockResolvedValueOnce(teachersPage);

    renderPage();

    await screen.findByText('Turma A');
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('blocks creating a classroom when the school is deactivated (AC: escola desativada não recebe turma nova)', async () => {
    mockedGet.mockResolvedValueOnce(inactiveSchool);
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce(teachersPage);

    renderPage();

    await screen.findByText(/esta escola está desativada/i);
    expect(screen.getByRole('button', { name: /criar turma/i })).toBeDisabled();
  });

  it('creating a classroom posts name + selected teacherId scoped to the school in the route', async () => {
    mockedGet.mockResolvedValueOnce(activeSchool);
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce(teachersPage);
    mockedPost.mockResolvedValueOnce({ ...classroomWithTeacher, id: 'new-1' });
    mockedGet.mockResolvedValueOnce(activeSchool);
    mockedGet.mockResolvedValueOnce([{ ...classroomWithTeacher, id: 'new-1' }]);

    renderPage();
    await screen.findByText(/nenhuma turma cadastrada/i);
    await userEvent.click(screen.getByRole('button', { name: /criar turma/i }));
    const dialog = await screen.findByRole('dialog', { name: /criar turma/i });
    await userEvent.type(within(dialog).getByLabelText(/nome da turma/i), 'Turma B');
    await userEvent.click(within(dialog).getByRole('button', { name: /^criar$/i }));

    expect(mockedPost).toHaveBeenCalledWith('/admin/schools/s1/classrooms', {
      name: 'Turma B',
      teacherId: undefined,
    });
  });

  it('deactivate/reactivate calls PATCH /admin/classrooms/:id/status and refreshes', async () => {
    mockedGet.mockResolvedValueOnce(activeSchool);
    mockedGet.mockResolvedValueOnce([classroomWithTeacher]);
    mockedGet.mockResolvedValueOnce(teachersPage);
    mockedPatch.mockResolvedValueOnce({ ...classroomWithTeacher, active: false });
    mockedGet.mockResolvedValueOnce(activeSchool);
    mockedGet.mockResolvedValueOnce([{ ...classroomWithTeacher, active: false }]);

    renderPage();
    await screen.findByText('Turma A');
    await userEvent.click(screen.getByRole('button', { name: /desativar/i }));

    expect(mockedPatch).toHaveBeenCalledWith('/admin/classrooms/c1/status', { active: false });
  });

  it('unassigning the teacher on edit sends teacherId: null (the "Sem professor atribuído" sentinel, never an empty string)', async () => {
    mockedGet.mockResolvedValueOnce(activeSchool);
    mockedGet.mockResolvedValueOnce([classroomWithTeacher]);
    mockedGet.mockResolvedValueOnce(teachersPage);
    mockedPatch.mockResolvedValueOnce({ ...classroomWithTeacher, teacherId: null, teacherName: null });
    mockedGet.mockResolvedValueOnce(activeSchool);
    mockedGet.mockResolvedValueOnce([{ ...classroomWithTeacher, teacherId: null, teacherName: null }]);

    renderPage();
    await screen.findByText('Turma A');
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    const dialog = await screen.findByRole('dialog', { name: /editar turma a/i });
    await userEvent.click(within(dialog).getByRole('combobox', { name: /professor titular/i }));
    await userEvent.click(await screen.findByRole('option', { name: /sem professor atribuído/i }));
    await userEvent.click(within(dialog).getByRole('button', { name: /salvar/i }));

    expect(mockedPatch).toHaveBeenCalledWith('/admin/classrooms/c1', {
      name: 'Turma A',
      teacherId: null,
    });
  });
});
