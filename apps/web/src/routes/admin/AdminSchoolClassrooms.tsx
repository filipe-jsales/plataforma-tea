import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError, apiClient } from '../../lib/apiClient';
import type { AdminSchoolProfile, AdminClassroomProfile } from '../../lib/adminSchoolTypes';
import type { PaginatedAdminUsers } from '../../lib/adminUserTypes';
import {
  Badge,
  Button,
  Dialog,
  InlineFeedback,
  LinkButton,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextField,
} from '../../components/ui';
import './AdminSchools.css';

// Radix Select reserva string vazia pro estado "sem seleção"/placeholder -
// um Select.Item com value="" quebra em runtime. Sentinel não-vazio aqui,
// convertido pra null (desvincular)/omitido (não atribuir) só na hora de
// montar o corpo da requisição.
const NO_TEACHER_VALUE = 'none';

interface ClassroomForm {
  name: string;
  teacherId: string;
}

const EMPTY_CLASSROOM_FORM: ClassroomForm = { name: '', teacherId: NO_TEACHER_VALUE };

// Gestão de turmas de uma escola (admin) - turma como container, sempre
// dentro de exatamente uma escola (schoolId vem da rota). Reaproveita os
// mesmos components/ui de AdminSchools.tsx/AdminUsers.tsx - mesma
// consistência visual pedida pela AC.
export function AdminSchoolClassrooms() {
  const { schoolId } = useParams<{ schoolId: string }>();

  const [school, setSchool] = useState<AdminSchoolProfile | null>(null);
  const [classrooms, setClassrooms] = useState<AdminClassroomProfile[] | null>(null);
  const [teacherOptions, setTeacherOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ClassroomForm>(EMPTY_CLASSROOM_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingClassroom, setEditingClassroom] = useState<AdminClassroomProfile | null>(null);
  const [editForm, setEditForm] = useState<ClassroomForm>(EMPTY_CLASSROOM_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  function reload() {
    if (!schoolId) return;
    setClassrooms(null);
    setLoadError(null);
    apiClient
      .get<AdminSchoolProfile>(`/admin/schools/${schoolId}`)
      .then(setSchool)
      .catch(() => setLoadError('Escola não encontrada.'));
    apiClient
      .get<AdminClassroomProfile[]>(`/admin/schools/${schoolId}/classrooms`)
      .then(setClassrooms)
      .catch((caught) => setLoadError(caught instanceof Error ? caught.message : 'Não foi possível carregar.'));
  }

  useEffect(reload, [schoolId]);

  useEffect(() => {
    apiClient
      .get<PaginatedAdminUsers>('/admin/users?role=teacher&active=true&pageSize=200')
      .then((data) =>
        setTeacherOptions(
          data.items.map((teacher) => ({ value: teacher.id, label: teacher.displayName })),
        ),
      )
      .catch(() => setTeacherOptions([]));
  }, []);

  const teacherSelectOptions = [{ value: NO_TEACHER_VALUE, label: 'Sem professor atribuído' }, ...teacherOptions];

  async function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!schoolId) return;
    if (createForm.name.trim().length < 2) {
      setCreateError('Informe o nome da turma.');
      return;
    }
    setCreateSaving(true);
    setCreateError(null);
    try {
      await apiClient.post(`/admin/schools/${schoolId}/classrooms`, {
        name: createForm.name.trim(),
        teacherId: createForm.teacherId === NO_TEACHER_VALUE ? undefined : createForm.teacherId,
      });
      setCreateOpen(false);
      setCreateForm(EMPTY_CLASSROOM_FORM);
      reload();
    } catch (caught) {
      setCreateError(caught instanceof ApiError ? caught.message : 'Não foi possível criar a turma.');
    } finally {
      setCreateSaving(false);
    }
  }

  function openEdit(classroom: AdminClassroomProfile) {
    setEditingClassroom(classroom);
    setEditForm({ name: classroom.name, teacherId: classroom.teacherId ?? NO_TEACHER_VALUE });
    setEditError(null);
  }

  async function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingClassroom) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await apiClient.patch(`/admin/classrooms/${editingClassroom.id}`, {
        name: editForm.name.trim(),
        teacherId: editForm.teacherId === NO_TEACHER_VALUE ? null : editForm.teacherId,
      });
      setEditingClassroom(null);
      reload();
    } catch (caught) {
      setEditError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar as alterações.');
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleStatus(classroom: AdminClassroomProfile) {
    setPendingStatusId(classroom.id);
    try {
      await apiClient.patch(`/admin/classrooms/${classroom.id}/status`, { active: !classroom.active });
      reload();
    } finally {
      setPendingStatusId(null);
    }
  }

  return (
    <main className="admin-schools staff-theme page">
      <LinkButton to="/admin/schools" variant="ghost" icon="←">
        Voltar para escolas
      </LinkButton>
      <h1>Turmas{school ? ` - ${school.name}` : ''}</h1>
      <p className="admin-schools__subtitle">
        Desativar uma turma bloqueia o login de aluno por ela imediatamente, mas nunca apaga matrículas ou
        alocações de desafio já registradas.
      </p>

      {school && !school.active && (
        <InlineFeedback kind="retry">
          Esta escola está desativada - reative-a antes de criar turmas novas.
        </InlineFeedback>
      )}

      <div className="admin-schools__toolbar">
        <Button
          icon="➕"
          disabled={!school?.active}
          onClick={() => { setCreateError(null); setCreateForm(EMPTY_CLASSROOM_FORM); setCreateOpen(true); }}
        >
          Criar turma
        </Button>
      </div>

      {loadError && <InlineFeedback kind="retry">{loadError}</InlineFeedback>}
      {classrooms === null && !loadError && <p>Carregando…</p>}

      {classrooms !== null && (
        <>
          <Table ariaLabel="Lista de turmas">
            <TableHead>
              <TableRow>
                <TableHeaderCell scope="col">Nome</TableHeaderCell>
                <TableHeaderCell scope="col">Código de entrada</TableHeaderCell>
                <TableHeaderCell scope="col">Professor</TableHeaderCell>
                <TableHeaderCell scope="col">Status</TableHeaderCell>
                <TableHeaderCell scope="col">Ações</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classrooms.map((classroom) => (
                <TableRow key={classroom.id}>
                  <TableCell>{classroom.name}</TableCell>
                  <TableCell>{classroom.joinCode}</TableCell>
                  <TableCell>{classroom.teacherName ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={classroom.active ? 'success' : 'neutral'}>
                      {classroom.active ? 'Ativa' : 'Desativada'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="secondary" icon="✏️" onClick={() => openEdit(classroom)}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      icon={classroom.active ? '🚫' : '✅'}
                      disabled={pendingStatusId === classroom.id}
                      onClick={() => toggleStatus(classroom)}
                    >
                      {classroom.active ? 'Desativar' : 'Reativar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {classrooms.length === 0 && <p className="admin-schools__empty">Nenhuma turma cadastrada nesta escola ainda.</p>}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen} title="Criar turma">
        <form className="admin-schools__form" onSubmit={handleCreateSubmit}>
          <TextField
            id="classroom-name"
            label="Nome da turma"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Select
            id="classroom-teacher"
            label="Professor titular"
            options={teacherSelectOptions}
            value={createForm.teacherId}
            onValueChange={(value) => setCreateForm((f) => ({ ...f, teacherId: value }))}
          />
          {createError && <InlineFeedback kind="retry">{createError}</InlineFeedback>}
          <Button type="submit" disabled={createSaving}>
            {createSaving ? 'Criando…' : 'Criar'}
          </Button>
        </form>
      </Dialog>

      <Dialog
        open={editingClassroom !== null}
        onOpenChange={(open) => !open && setEditingClassroom(null)}
        title={editingClassroom ? `Editar ${editingClassroom.name}` : 'Editar'}
      >
        {editingClassroom && (
          <form className="admin-schools__form" onSubmit={handleEditSubmit}>
            <TextField
              id="edit-classroom-name"
              label="Nome da turma"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Select
              id="edit-classroom-teacher"
              label="Professor titular"
              options={teacherSelectOptions}
              value={editForm.teacherId}
              onValueChange={(value) => setEditForm((f) => ({ ...f, teacherId: value }))}
            />
            {editError && <InlineFeedback kind="retry">{editError}</InlineFeedback>}
            <Button type="submit" disabled={editSaving}>
              {editSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        )}
      </Dialog>
    </main>
  );
}
