import { useEffect, useState } from 'react';
import { ApiError, apiClient } from '../../lib/apiClient';
import type { AdminSchoolProfile } from '../../lib/adminSchoolTypes';
import {
  Badge,
  Button,
  Dialog,
  InlineFeedback,
  LinkButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextField,
} from '../../components/ui';
import './AdminSchools.css';
import { Ban, Check, Pencil, Plus, School,} from 'lucide-react';

interface SchoolForm {
  name: string;
  externalId: string;
}

const EMPTY_SCHOOL_FORM: SchoolForm = { name: '', externalId: '' };

// Gestão de escolas e turmas (admin) — CRUD sobre "escola" (container
// multi-tenant). "Desativar" nunca apaga turmas/matrículas vinculadas — é
// soft delete (B1), mesma filosofia de reversibilidade de 1.4 (usuários).
// Reaproveita components/ui, mesmo padrão visual de AdminUsers.tsx (1.4).
export function AdminSchools() {
  const [schools, setSchools] = useState<AdminSchoolProfile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<SchoolForm>(EMPTY_SCHOOL_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingSchool, setEditingSchool] = useState<AdminSchoolProfile | null>(null);
  const [editForm, setEditForm] = useState<SchoolForm>(EMPTY_SCHOOL_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  function reload() {
    setSchools(null);
    setLoadError(null);
    apiClient
      .get<AdminSchoolProfile[]>('/admin/schools')
      .then(setSchools)
      .catch((caught) => setLoadError(caught instanceof Error ? caught.message : 'Não foi possível carregar.'));
  }

  useEffect(reload, []);

  async function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (createForm.name.trim().length < 2) {
      setCreateError('Informe o nome da escola.');
      return;
    }
    setCreateSaving(true);
    setCreateError(null);
    try {
      await apiClient.post('/admin/schools', {
        name: createForm.name.trim(),
        externalId: createForm.externalId.trim() || undefined,
      });
      setCreateOpen(false);
      setCreateForm(EMPTY_SCHOOL_FORM);
      reload();
    } catch (caught) {
      setCreateError(caught instanceof ApiError ? caught.message : 'Não foi possível criar a escola.');
    } finally {
      setCreateSaving(false);
    }
  }

  function openEdit(school: AdminSchoolProfile) {
    setEditingSchool(school);
    setEditForm({ name: school.name, externalId: school.externalId ?? '' });
    setEditError(null);
  }

  async function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingSchool) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await apiClient.patch(`/admin/schools/${editingSchool.id}`, {
        name: editForm.name.trim(),
        externalId: editForm.externalId.trim(),
      });
      setEditingSchool(null);
      reload();
    } catch (caught) {
      setEditError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar as alterações.');
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleStatus(school: AdminSchoolProfile) {
    setPendingStatusId(school.id);
    try {
      await apiClient.patch(`/admin/schools/${school.id}/status`, { active: !school.active });
      reload();
    } finally {
      setPendingStatusId(null);
    }
  }

  return (
    <main className="admin-schools staff-theme page">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Escolas</h1>
      <p className="admin-schools__subtitle">
        Cada turma pertence a exatamente uma escola. Desativar uma escola bloqueia a criação de turmas novas
        nela, mas nunca apaga turmas/matrículas já existentes — não há exclusão permanente aqui.
      </p>

      <div className="admin-schools__toolbar">
        <Button icon={<Plus />} onClick={() => { setCreateError(null); setCreateForm(EMPTY_SCHOOL_FORM); setCreateOpen(true); }}>
          Criar escola
        </Button>
      </div>

      {loadError && <InlineFeedback kind="retry">{loadError}</InlineFeedback>}
      {schools === null && !loadError && <p>Carregando…</p>}

      {schools !== null && (
        <>
          <Table ariaLabel="Lista de escolas">
            <TableHead>
              <TableRow>
                <TableHeaderCell scope="col">Nome</TableHeaderCell>
                <TableHeaderCell scope="col">Identificador externo</TableHeaderCell>
                <TableHeaderCell scope="col">Status</TableHeaderCell>
                <TableHeaderCell scope="col">Ações</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell>{school.name}</TableCell>
                  <TableCell>{school.externalId ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={school.active ? 'success' : 'neutral'}>
                      {school.active ? 'Ativa' : 'Desativada'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <LinkButton to={`/admin/schools/${school.id}/classrooms`} variant="secondary" icon={<School />}>
                      Turmas
                    </LinkButton>
                    <Button variant="secondary" icon={<Pencil />} onClick={() => openEdit(school)} style={{ marginLeft: '12px' }}>
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      style={{ marginLeft: '12px' }}
                      icon={school.active ? <Ban /> : <Check />}
                      disabled={pendingStatusId === school.id}
                      onClick={() => toggleStatus(school)}
                    >
                      {school.active ? 'Desativar' : 'Reativar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {schools.length === 0 && <p className="admin-schools__empty">Nenhuma escola cadastrada ainda.</p>}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen} title="Criar escola">
        <form className="admin-schools__form" onSubmit={handleCreateSubmit}>
          <TextField
            id="school-name"
            label="Nome da escola"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            id="school-external-id"
            label="Identificador externo (opcional, ex.: código INEP)"
            value={createForm.externalId}
            onChange={(e) => setCreateForm((f) => ({ ...f, externalId: e.target.value }))}
          />
          {createError && <InlineFeedback kind="retry">{createError}</InlineFeedback>}
          <Button type="submit" disabled={createSaving}>
            {createSaving ? 'Criando…' : 'Criar'}
          </Button>
        </form>
      </Dialog>

      <Dialog
        open={editingSchool !== null}
        onOpenChange={(open) => !open && setEditingSchool(null)}
        title={editingSchool ? `Editar ${editingSchool.name}` : 'Editar'}
      >
        {editingSchool && (
          <form className="admin-schools__form" onSubmit={handleEditSubmit}>
            <TextField
              id="edit-school-name"
              label="Nome da escola"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <TextField
              id="edit-school-external-id"
              label="Identificador externo (opcional)"
              value={editForm.externalId}
              onChange={(e) => setEditForm((f) => ({ ...f, externalId: e.target.value }))}
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
