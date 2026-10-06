import { useEffect, useState } from 'react';
import { ApiError, apiClient } from '../../lib/apiClient';
import { getIllustrationAsset } from '../../lib/illustrationAssets';
import type { GuardianConsentAdminView } from '../../lib/adminGuardianConsentTypes';
import type { AdminUserProfile, CreateStaffUserResponse, PaginatedAdminUsers, UserRole } from '../../lib/adminUserTypes';
import type { ResetCredentialResult } from '../../lib/studentAccountTypes';
import {
  Badge,
  Button,
  Dialog,
  InlineFeedback,
  LinkButton,
  SegmentedControl,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextField,
} from '../../components/ui';
import './AdminUsers.css';

import { Ban, Check, Key, Pencil,Plus,Shield}from "lucide-react";

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Todos os papéis' },
  { value: 'student', label: 'Aluno' },
  { value: 'teacher', label: 'Professor' },
  { value: 'admin', label: 'Admin' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Desativados' },
];

const ROLE_LABEL: Record<UserRole, string> = { student: 'Aluno', teacher: 'Professor', admin: 'Admin' };

const PAGE_SIZE = 20;

interface StaffForm {
  displayName: string;
  email: string;
  role: 'teacher' | 'admin';
}

const EMPTY_STAFF_FORM: StaffForm = { displayName: '', email: '', role: 'teacher' };

// 1.4 - CRUD de usuários (admin). Tela administrativa única pra
// professores/admins e (indiretamente) alunos - nunca hard delete (AC
// explícita); toda criação/edição/ativação é feita por
// components/ui (regra de engenharia 3.11), nunca HTML cru.
export function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedAdminUsers | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<StaffForm>(EMPTY_STAFF_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createResult, setCreateResult] = useState<CreateStaffUserResponse | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUserProfile | null>(null);
  const [editForm, setEditForm] = useState<StaffForm>(EMPTY_STAFF_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  // A2 (AC4) - "quando um admin consulta o cadastro daquele aluno...
  // consegue visualizar quando e por quem o consentimento foi coletado".
  const [consentStudent, setConsentStudent] = useState<AdminUserProfile | null>(null);
  const [consentData, setConsentData] = useState<GuardianConsentAdminView | null>(null);

  // 1.3 - recuperação de acesso: admin gera uma sequência de login nova
  // pro aluno que esqueceu a credencial (mesmo endpoint que o painel do
  // professor usa - ver StudentAccountsController, @Roles(TEACHER, ADMIN)).
  const [resettingStudent, setResettingStudent] = useState<AdminUserProfile | null>(null);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<ResetCredentialResult | null>(null);

  function reload() {
    setData(null);
    setLoadError(null);
    const params = new URLSearchParams();
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('active', statusFilter);
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    apiClient
      .get<PaginatedAdminUsers>(`/admin/users?${params.toString()}`)
      .then(setData)
      .catch((caught) => setLoadError(caught instanceof Error ? caught.message : 'Não foi possível carregar.'));
  }

  useEffect(reload, [roleFilter, statusFilter, page]);

  async function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (createForm.displayName.trim().length < 2) {
      setCreateError('Informe o nome completo.');
      return;
    }
    setCreateSaving(true);
    setCreateError(null);
    try {
      const result = await apiClient.post<CreateStaffUserResponse>('/admin/users', {
        displayName: createForm.displayName.trim(),
        email: createForm.email.trim(),
        role: createForm.role,
      });
      setCreateResult(result);
      setCreateForm(EMPTY_STAFF_FORM);
      reload();
    } catch (caught) {
      setCreateError(caught instanceof ApiError ? caught.message : 'Não foi possível criar o usuário.');
    } finally {
      setCreateSaving(false);
    }
  }

  function openEdit(user: AdminUserProfile) {
    setEditingUser(user);
    setEditForm({ displayName: user.displayName, email: user.email ?? '', role: user.role === 'admin' ? 'admin' : 'teacher' });
    setEditError(null);
  }

  async function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const body: Record<string, unknown> = { displayName: editForm.displayName.trim() };
      if (editingUser.role !== 'student') {
        body.email = editForm.email.trim();
        body.role = editForm.role;
      }
      await apiClient.patch(`/admin/users/${editingUser.id}`, body);
      setEditingUser(null);
      reload();
    } catch (caught) {
      setEditError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar as alterações.');
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleStatus(user: AdminUserProfile) {
    setPendingStatusId(user.id);
    try {
      await apiClient.patch(`/admin/users/${user.id}/status`, { active: !user.active });
      reload();
    } finally {
      setPendingStatusId(null);
    }
  }

  function openConsent(user: AdminUserProfile) {
    setConsentStudent(user);
    setConsentData(null);
    apiClient.get<GuardianConsentAdminView>(`/admin/students/${user.id}/guardian-consent`).then(setConsentData);
  }

  function openReset(user: AdminUserProfile) {
    setResettingStudent(user);
    setResetResult(null);
    setResetError(null);
  }

  async function handleReset() {
    if (!resettingStudent) return;
    setResetSaving(true);
    setResetError(null);
    try {
      const result = await apiClient.post<ResetCredentialResult>(
        `/teacher/students/${resettingStudent.id}/reset-credential`,
        {},
      );
      setResetResult(result);
    } catch (caught) {
      setResetError(caught instanceof ApiError ? caught.message : 'Não foi possível gerar uma nova credencial.');
    } finally {
      setResetSaving(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <main className="admin-users staff-theme page">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Usuários</h1>
      <p className="admin-users__subtitle">
        Professores, admins e alunos da escola. Desativar bloqueia o login imediatamente, mas nunca apaga o
        histórico - não existe exclusão permanente aqui.
      </p>

      <div className="admin-users__toolbar">
        <SegmentedControl ariaLabel="Filtrar por papel" options={ROLE_FILTER_OPTIONS} value={roleFilter} onValueChange={(v) => { setPage(1); setRoleFilter(v); }} />
        <SegmentedControl ariaLabel="Filtrar por status" options={STATUS_FILTER_OPTIONS} value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v); }} />
        <Button icon={<Plus />} onClick={() => { setCreateResult(null); setCreateError(null); setCreateForm(EMPTY_STAFF_FORM); setCreateOpen(true); }}>
          Criar professor/admin
        </Button>
      </div>

      {loadError && <InlineFeedback kind="retry">{loadError}</InlineFeedback>}
      {data === null && !loadError && <p>Carregando…</p>}

      {data !== null && (
        <>
          <Table ariaLabel="Lista de usuários">
            <TableHead>
              <TableRow>
                <TableHeaderCell scope="col">Nome</TableHeaderCell>
                <TableHeaderCell scope="col">Papel</TableHeaderCell>
                <TableHeaderCell scope="col">E-mail</TableHeaderCell>
                <TableHeaderCell scope="col">Status</TableHeaderCell>
                <TableHeaderCell scope="col">Ações</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.displayName}</TableCell>
                  <TableCell>{ROLE_LABEL[user.role]}</TableCell>
                  <TableCell>{user.email ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.active ? 'success' : 'neutral'}>{user.active ? 'Ativo' : 'Desativado'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="secondary" icon={<Pencil />} onClick={() => openEdit(user)}>
                      Editar
                    </Button>
                    {user.role === 'student' && (
                      <Button variant="secondary" icon={<Shield />} onClick={() => openConsent(user)} style={{ marginLeft: '12px' }}>
                        Consentimento
                      </Button>
                    )}
                    {user.role === 'student' && user.active && (
                      <Button variant="secondary" icon={<Key />} onClick={() => openReset(user)} style={{ marginLeft: '12px' }}>
                        Recuperar acesso
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      style={{ marginLeft: '12px' }}
                      icon={user.active ? <Ban /> : <Check />}
                      disabled={pendingStatusId === user.id}
                      onClick={() => toggleStatus(user)}
                    >
                      {user.active ? 'Desativar' : 'Reativar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data.items.length === 0 && <p className="admin-users__empty">Nenhum usuário encontrado com esses filtros.</p>}

          <div className="admin-users__pagination">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span>
              Página {data.page} de {totalPages}
            </span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateResult(null);
        }}
        title="Criar professor ou admin"
        description="Alunos nunca são criados aqui - use 'Adicionar aluno', no painel do professor (1.2)."
      >
        {!createResult && (
          <form className="admin-users__form" onSubmit={handleCreateSubmit}>
            <TextField
              id="staff-name"
              label="Nome completo"
              value={createForm.displayName}
              onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
            />
            <TextField
              id="staff-email"
              label="E-mail"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            />
            <SegmentedControl
              ariaLabel="Papel"
              options={[
                { value: 'teacher', label: 'Professor' },
                { value: 'admin', label: 'Admin' },
              ]}
              value={createForm.role}
              onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v as 'teacher' | 'admin' }))}
            />
            {createError && <InlineFeedback kind="retry">{createError}</InlineFeedback>}
            <Button type="submit" disabled={createSaving}>
              {createSaving ? 'Criando…' : 'Criar'}
            </Button>
          </form>
        )}

        {createResult && (
          <div className="admin-users__result">
            <InlineFeedback kind="success">
              Conta de {createResult.user.displayName} criada. Repasse o link abaixo pra pessoa definir a
              própria senha - hoje isso ainda não é enviado por e-mail automaticamente.
            </InlineFeedback>
            <p className="admin-users__result-label">Link de definição de senha (uso único):</p>
            <code className="admin-users__result-token">{createResult.passwordSetupToken}</code>
            {createResult.totpOtpauthUri && (
              <>
                <p className="admin-users__result-label">
                  Segredo do segundo fator (cadastrar num app autenticador):
                </p>
                <code className="admin-users__result-token">{createResult.totpOtpauthUri}</code>
              </>
            )}
            <Button onClick={() => setCreateOpen(false)}>Fechar</Button>
          </div>
        )}
      </Dialog>

      <Dialog
        open={editingUser !== null}
        onOpenChange={(open) => !open && setEditingUser(null)}
        title={editingUser ? `Editar ${editingUser.displayName}` : 'Editar'}
      >
        {editingUser && (
          <form className="admin-users__form" onSubmit={handleEditSubmit}>
            <TextField
              id="edit-name"
              label="Nome completo"
              value={editForm.displayName}
              onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
            />
            {editingUser.role !== 'student' && (
              <>
                <TextField
                  id="edit-email"
                  label="E-mail"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
                <SegmentedControl
                  ariaLabel="Papel"
                  options={[
                    { value: 'teacher', label: 'Professor' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                  value={editForm.role}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as 'teacher' | 'admin' }))}
                />
              </>
            )}
            {editingUser.role === 'student' && (
              <p className="admin-users__hint">
                Credencial de aluno (avatar/sequência de imagens) segue o fluxo próprio (1.3, botão "Recuperar
                acesso" na lista) - aqui só o nome é editável.
              </p>
            )}
            {editError && <InlineFeedback kind="retry">{editError}</InlineFeedback>}
            <Button type="submit" disabled={editSaving}>
              {editSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        )}
      </Dialog>

      <Dialog
        open={consentStudent !== null}
        onOpenChange={(open) => !open && setConsentStudent(null)}
        title={consentStudent ? `Consentimento do responsável - ${consentStudent.displayName}` : 'Consentimento do responsável'}
      >
        {consentStudent && consentData === null && <p>Carregando…</p>}
        {consentStudent && consentData && !consentData.recorded && (
          <InlineFeedback kind="retry">
            Consentimento do responsável legal ainda não registrado - a credencial de acesso deste aluno
            está pendente até essa etapa ser concluída.
          </InlineFeedback>
        )}
        {consentStudent && consentData?.recorded && (
          <dl className="admin-users__consent-details">
            <dt>Responsável</dt>
            <dd>{consentData.guardianName}</dd>
            <dt>Vínculo</dt>
            <dd>{consentData.guardianRelationship}</dd>
            <dt>Contato</dt>
            <dd>{consentData.guardianContact}</dd>
            <dt>Registrado em</dt>
            <dd>{consentData.consentedAt ? new Date(consentData.consentedAt).toLocaleString('pt-BR') : '-'}</dd>
            <dt>Registrado por</dt>
            <dd>{consentData.collectedByDisplayName ?? '-'}</dd>
          </dl>
        )}
      </Dialog>

      <Dialog
        open={resettingStudent !== null}
        onOpenChange={(open) => !open && setResettingStudent(null)}
        title={resettingStudent ? `Recuperar acesso - ${resettingStudent.displayName}` : 'Recuperar acesso'}
        description="Gera uma sequência de login nova pro aluno. A sequência antiga deixa de funcionar imediatamente."
      >
        {resettingStudent && !resetResult && (
          <div className="admin-users__reset-body">
            <p>
              {resettingStudent.displayName} não vai conseguir mais entrar com a sequência de imagens antiga
              depois desta ação. Confirme só se o aluno realmente esqueceu a credencial.
            </p>
            {resetError && <InlineFeedback kind="retry">{resetError}</InlineFeedback>}
            <Button onClick={handleReset} disabled={resetSaving}>
              {resetSaving ? 'Gerando…' : 'Gerar nova credencial'}
            </Button>
          </div>
        )}

        {resetResult && (
          <div className="admin-users__reset-body">
            <InlineFeedback kind="success">
              Nova credencial gerada. Mostre a sequência abaixo pro aluno anotar/memorizar.
            </InlineFeedback>
            <div className="admin-users__credential-images">
              {resetResult.credential.loginImages.map((image, index) => (
                <div key={index} className="admin-users__credential-image">
                  <img src={getIllustrationAsset(image.assetRef)} alt={image.label} />
                  <span aria-hidden="true">{index + 1}</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={() => setResettingStudent(null)}>
              Fechar
            </Button>
          </div>
        )}
      </Dialog>
    </main>
  );
}
