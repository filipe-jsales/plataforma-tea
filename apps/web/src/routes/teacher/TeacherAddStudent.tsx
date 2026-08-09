import { useEffect, useState } from 'react';
import { ApiError, apiClient } from '../../lib/apiClient';
import { getIllustrationAsset } from '../../lib/illustrationAssets';
import type { StudentAccountCredential } from '../../lib/studentAccountTypes';
import { Button, InlineFeedback, LinkButton, SelectableCard, Select, TextField } from '../../components/ui';
import './TeacherAddStudent.css';

interface TeacherClassroomOption {
  id: string;
  name: string;
  joinCode: string;
}

interface AvatarOption {
  id: string;
  label: string;
  assetRef: string;
}

// 1.2 — Criação de conta de aluno feita pela escola/professor (não
// autoatendimento). Sem campo de e-mail/senha/telefone (AC) — o formulário
// só pede nome, turma (só aparece quando há mais de uma — AC) e avatar
// (opcional; quando não escolhido, o backend sorteia um). Ao salvar, a
// credencial gerada (avatar + sequência de imagens) aparece numa tela
// imprimível — nunca o nome do aluno vira parte dela.
export function TeacherAddStudent() {
  const [classrooms, setClassrooms] = useState<TeacherClassroomOption[] | null>(null);
  const [avatars, setAvatars] = useState<AvatarOption[] | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [avatarId, setAvatarId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StudentAccountCredential | null>(null);

  useEffect(() => {
    apiClient.get<TeacherClassroomOption[]>('/home/teacher').then((list) => {
      setClassrooms(list);
      if (list.length === 1) setClassroomId(list[0].id);
    });
    apiClient.get<AvatarOption[]>('/illustrations?kind=avatar').then(setAvatars);
  }, []);

  function resetForm() {
    setDisplayName('');
    setAvatarId(null);
    setResult(null);
    setError(null);
    if (classrooms && classrooms.length !== 1) setClassroomId('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (displayName.trim().length === 0) {
      setError('Informe o nome do aluno.');
      return;
    }
    if (!classroomId) {
      setError('Escolha a turma do aluno.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await apiClient.post<StudentAccountCredential>('/teacher/students', {
        displayName: displayName.trim(),
        classroomId,
        ...(avatarId ? { avatarId } : {}),
      });
      setResult(response);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível cadastrar o aluno.');
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <main className="teacher-add-student staff-theme page">
        <LinkButton to="/home" variant="ghost" icon="←">
          Voltar
        </LinkButton>

        {result.duplicateWarning && (
          <InlineFeedback kind="info">
            Já existe outro aluno com um nome parecido nesta turma. A conta foi criada normalmente — só
            confira se não é um cadastro duplicado do mesmo aluno.
          </InlineFeedback>
        )}

        <div className="teacher-add-student__credential-card" id="student-credential-card">
          <h1>Credencial de acesso</h1>
          <p className="teacher-add-student__credential-name">{result.student.displayName}</p>
          <p className="teacher-add-student__credential-meta">
            Turma: {result.classroom.name} (código {result.classroom.joinCode})
          </p>

          <div className="teacher-add-student__credential-section">
            <h2>1. Meu avatar</h2>
            <img
              className="teacher-add-student__credential-avatar"
              src={getIllustrationAsset(result.credential.avatar.assetRef)}
              alt={result.credential.avatar.label}
            />
          </div>

          <div className="teacher-add-student__credential-section">
            <h2>2. Minha senha de imagens (nesta ordem)</h2>
            <div className="teacher-add-student__credential-images">
              {result.credential.loginImages.map((image, index) => (
                <div key={index} className="teacher-add-student__credential-image">
                  <img src={getIllustrationAsset(image.assetRef)} alt={image.label} />
                  <span aria-hidden="true">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="teacher-add-student__actions">
          <Button icon="🖨️" onClick={() => window.print()}>
            Imprimir credencial
          </Button>
          <Button variant="secondary" icon="➕" onClick={resetForm}>
            Cadastrar outro aluno
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="teacher-add-student staff-theme page">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Adicionar aluno</h1>
      <p className="teacher-add-student__subtitle">
        O aluno nunca cria a própria conta. Informe só o nome e a turma — o sistema gera a credencial de
        acesso automaticamente (sem e-mail, sem senha digitada).
      </p>

      <form className="teacher-add-student__form" onSubmit={handleSubmit}>
        <TextField
          id="student-name"
          label="Nome do aluno"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />

        {classrooms !== null && classrooms.length > 1 && (
          <Select
            id="student-classroom"
            label="Turma"
            placeholder="Escolha a turma"
            value={classroomId}
            onValueChange={setClassroomId}
            options={classrooms.map((classroom) => ({ value: classroom.id, label: classroom.name }))}
          />
        )}
        {classrooms !== null && classrooms.length === 0 && (
          <InlineFeedback kind="info">
            Você ainda não tem nenhuma turma sob sua responsabilidade — peça para um admin te vincular a
            uma turma antes de cadastrar alunos.
          </InlineFeedback>
        )}

        {avatars !== null && avatars.length > 0 && (
          <fieldset className="teacher-add-student__avatar-field">
            <legend>Avatar (opcional — se não escolher, o sistema sorteia um)</legend>
            <div className="teacher-add-student__avatar-grid">
              {avatars.map((avatar) => (
                <SelectableCard
                  key={avatar.id}
                  icon={<img src={getIllustrationAsset(avatar.assetRef)} alt="" className="teacher-add-student__avatar-icon" />}
                  selected={avatarId === avatar.id}
                  onSelect={() => setAvatarId((current) => (current === avatar.id ? null : avatar.id))}
                >
                  {avatar.label}
                </SelectableCard>
              ))}
            </div>
          </fieldset>
        )}

        {error && <InlineFeedback kind="retry">{error}</InlineFeedback>}

        <Button type="submit" disabled={saving || classrooms === null || classrooms.length === 0}>
          {saving ? 'Cadastrando…' : 'Cadastrar aluno'}
        </Button>
      </form>
    </main>
  );
}
