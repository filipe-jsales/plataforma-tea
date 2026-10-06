import { useEffect, useState } from 'react';
import { ApiError, apiClient } from '../../lib/apiClient';
import { getIllustrationAsset } from '../../lib/illustrationAssets';
import type { PendingStudentAccount, StudentAccountCredential } from '../../lib/studentAccountTypes';
import { Button, InlineFeedback, LinkButton, SelectableCard, Select, TextField, ToggleSwitch } from '../../components/ui';
import './TeacherAddStudent.css';
import { Plus, Printer } from 'lucide-react';

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

interface GuardianForm {
  guardianName: string;
  guardianRelationship: string;
  guardianContact: string;
  consentAccepted: boolean;
}

const EMPTY_GUARDIAN_FORM: GuardianForm = {
  guardianName: '',
  guardianRelationship: '',
  guardianContact: '',
  consentAccepted: false,
};

type Step = 'student' | 'guardian' | 'credential';

// 1.2/A2 - Criação de conta de aluno feita pela escola/professor (não
// autoatendimento), em 3 telas desde A2: (1) dados do aluno, (2)
// responsável legal + consentimento (ECA) - etapa OBRIGATÓRIA, nunca
// pulável - e só depois (3) a credencial gerada aparece. Sem campo de
// e-mail/senha/telefone do ALUNO em nenhuma etapa (AC de 1.2) - o contato
// coletado na etapa 2 é do RESPONSÁVEL, nunca do aluno.
export function TeacherAddStudent() {
  const [step, setStep] = useState<Step>('student');
  const [classrooms, setClassrooms] = useState<TeacherClassroomOption[] | null>(null);
  const [avatars, setAvatars] = useState<AvatarOption[] | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [avatarId, setAvatarId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingStudentAccount | null>(null);

  const [guardianForm, setGuardianForm] = useState<GuardianForm>(EMPTY_GUARDIAN_FORM);
  const [guardianSaving, setGuardianSaving] = useState(false);
  const [guardianError, setGuardianError] = useState<string | null>(null);

  const [credential, setCredential] = useState<StudentAccountCredential | null>(null);

  useEffect(() => {
    apiClient.get<TeacherClassroomOption[]>('/home/teacher').then((list) => {
      setClassrooms(list);
      if (list.length === 1) setClassroomId(list[0].id);
    });
    apiClient.get<AvatarOption[]>('/illustrations?kind=avatar').then(setAvatars);
  }, []);

  function resetAll() {
    setStep('student');
    setDisplayName('');
    setAvatarId(null);
    setPending(null);
    setError(null);
    setGuardianForm(EMPTY_GUARDIAN_FORM);
    setGuardianError(null);
    setCredential(null);
    if (classrooms && classrooms.length !== 1) setClassroomId('');
  }

  async function handleStudentSubmit(event: React.FormEvent) {
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
      const response = await apiClient.post<PendingStudentAccount>('/teacher/students', {
        displayName: displayName.trim(),
        classroomId,
        ...(avatarId ? { avatarId } : {}),
      });
      setPending(response);
      setStep('guardian');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível cadastrar o aluno.');
    } finally {
      setSaving(false);
    }
  }

  // A2 (AC1/AC2) - etapa obrigatória: responsável legal + consentimento
  // explícito, sempre ANTES de qualquer credencial existir. Validação
  // client-side espelha a do backend (nunca confiar só numa das duas -
  // mesmo padrão de duplo-check já usado nos templates de desafio).
  async function handleGuardianSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!pending) return;
    if (guardianForm.guardianName.trim().length < 2) {
      setGuardianError('Informe o nome do responsável legal.');
      return;
    }
    if (guardianForm.guardianRelationship.trim().length < 2) {
      setGuardianError('Informe o vínculo do responsável com o aluno (ex.: mãe, pai, tutor legal).');
      return;
    }
    if (guardianForm.guardianContact.trim().length < 3) {
      setGuardianError('Informe um contato do responsável (telefone ou e-mail).');
      return;
    }
    if (!guardianForm.consentAccepted) {
      setGuardianError('É necessário confirmar o consentimento do responsável legal para continuar.');
      return;
    }
    setGuardianSaving(true);
    setGuardianError(null);
    try {
      const response = await apiClient.post<StudentAccountCredential>(
        `/teacher/students/${pending.student.id}/guardian-consent`,
        {
          guardianName: guardianForm.guardianName.trim(),
          guardianRelationship: guardianForm.guardianRelationship.trim(),
          guardianContact: guardianForm.guardianContact.trim(),
          consentAccepted: true,
        },
      );
      setCredential(response);
      setStep('credential');
    } catch (caught) {
      setGuardianError(caught instanceof ApiError ? caught.message : 'Não foi possível registrar o consentimento.');
    } finally {
      setGuardianSaving(false);
    }
  }

  if (step === 'credential' && credential) {
    return (
      <main className="teacher-add-student staff-theme page page--narrow">
        <LinkButton to="/home" variant="ghost" icon="←">
          Voltar
        </LinkButton>

        {pending?.duplicateWarning && (
          <InlineFeedback kind="info">
            Já existe outro aluno com um nome parecido nesta turma. A conta foi criada normalmente - só
            confira se não é um cadastro duplicado do mesmo aluno.
          </InlineFeedback>
        )}

        <div className="teacher-add-student__credential-card" id="student-credential-card">
          <h1 style={{ textAlign: 'center' }}>Credencial de acesso</h1>
          <p className="teacher-add-student__credential-name">Nome: {credential.student.displayName}</p>
          <p className="teacher-add-student__credential-meta">
            Turma: {credential.classroom.name} (código da turma: {credential.classroom.joinCode})
          </p>

          <div className="teacher-add-student__credential-section">
            <h2>1. Meu avatar</h2>
            <img
              className="teacher-add-student__credential-avatar"
              src={getIllustrationAsset(credential.credential.avatar.assetRef)}
              alt={credential.credential.avatar.label}
            />
          </div>

          <div className="teacher-add-student__credential-section">
            <h2>2. Minha senha de imagens em ordem:</h2>
            <div className="teacher-add-student__credential-images">
              {credential.credential.loginImages.map((image, index) => (
                <div key={index} className="teacher-add-student__credential-image">
                  <img src={getIllustrationAsset(image.assetRef)} alt={image.label} />
                  <span aria-hidden="true">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="teacher-add-student__actions">
          <Button icon={<Printer />} onClick={() => window.print()}>
            Imprimir credencial
          </Button>
          <Button variant="secondary" icon={<Plus />} onClick={resetAll}>
            Cadastrar outro aluno
          </Button>
        </div>
      </main>
    );
  }

  if (step === 'guardian' && pending) {
    return (
      <main className="teacher-add-student staff-theme page page--narrow">
        <LinkButton to="/home" variant="ghost" icon="←">
          Voltar
        </LinkButton>
        <h1>Responsável legal</h1>
        <p className="teacher-add-student__subtitle">
          Antes de liberar a credencial de acesso de {pending.student.displayName}, registre o consentimento
          do responsável legal (conforme o ECA). Essa etapa é obrigatória - a credencial só é gerada depois
          dela.
        </p>

        <form className="teacher-add-student__form" onSubmit={handleGuardianSubmit}>
          <TextField
            id="guardian-name"
            label="Nome do responsável legal"
            value={guardianForm.guardianName}
            onChange={(event) => setGuardianForm((form) => ({ ...form, guardianName: event.target.value }))}
          />
          <TextField
            id="guardian-relationship"
            label="Vínculo com o aluno (ex.: mãe, pai, tutor legal)"
            value={guardianForm.guardianRelationship}
            onChange={(event) =>
              setGuardianForm((form) => ({ ...form, guardianRelationship: event.target.value }))
            }
          />
          <TextField
            id="guardian-contact"
            label="Contato do responsável (telefone ou e-mail)"
            value={guardianForm.guardianContact}
            onChange={(event) => setGuardianForm((form) => ({ ...form, guardianContact: event.target.value }))}
          />
          <ToggleSwitch
            id="guardian-consent"
            label="Confirmo que o responsável legal foi informado e consentiu com a coleta de dados deste aluno, conforme o ECA."
            checked={guardianForm.consentAccepted}
            onCheckedChange={(checked) => setGuardianForm((form) => ({ ...form, consentAccepted: checked }))}
          />

          {guardianError && <InlineFeedback kind="retry">{guardianError}</InlineFeedback>}

          <Button type="submit" disabled={guardianSaving}>
            {guardianSaving ? 'Registrando…' : 'Registrar consentimento e liberar credencial'}
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main className="teacher-add-student staff-theme page page--narrow">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Adicionar aluno</h1>
      <p className="teacher-add-student__subtitle">
        O aluno nunca cria a própria conta. Informe só o nome e a turma depois de registrar o consentimento
        do responsável legal, o sistema gera a credencial de acesso automaticamente.
      </p>

      <form className="teacher-add-student__form" onSubmit={handleStudentSubmit}>
        <TextField
          id="student-name"
          label="Nome do aluno"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          style={{ marginTop: 'var(--space-2)' }}
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
            Você ainda não tem nenhuma turma sob sua responsabilidade - peça para um admin te vincular a
            uma turma antes de cadastrar alunos.
          </InlineFeedback>
        )}

        {avatars !== null && avatars.length > 0 && (
          <fieldset className="teacher-add-student__avatar-field">
            <label className="teacher-add-student__avatar-label">Avatar</label>
            <div className="teacher-add-student__avatar-grid" style={{ marginTop: 'var(--space-2)' }}>
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
          {saving ? 'Cadastrando…' : 'Continuar'}
        </Button>
      </form>
    </main>
  );
}
