import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import type { TeacherChallengeSummary } from '../../lib/challengeTemplateTypes';
import { Button, Dialog, LinkButton } from '../../components/ui';
import './TeacherChallenges.css';

// 4.2 (AC5) — "Meus desafios": lista só os desafios que O PRÓPRIO professor
// criou via template. Nenhuma ação aqui (editar/duplicar/excluir) expõe
// `Challenge.config`/estrutura de blocos — editar e duplicar reabrem
// exatamente o mesmo formulário guiado da criação (ver TeacherChallengeForm
// route), nunca um editor bruto.
export function TeacherChallenges() {
  const [challenges, setChallenges] = useState<TeacherChallengeSummary[] | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function reload() {
    setChallenges(null);
    apiClient.get<TeacherChallengeSummary[]>('/teacher/challenges').then(setChallenges);
  }

  useEffect(reload, []);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await apiClient.delete<void>(`/teacher/challenges/${pendingDeleteId}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="teacher-challenges staff-theme page">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Meus desafios</h1>
      <p className="teacher-challenges__subtitle">
        Desafios que você criou escolhendo um template pronto e ajustando só os parâmetros — nunca
        blocos ou código.
      </p>

      <LinkButton to="/teacher/challenges/new" icon="➕">
        Criar desafio
      </LinkButton>

      {challenges === null && <p className="teacher-challenges__loading">Carregando…</p>}
      {challenges !== null && challenges.length === 0 && (
        <p className="teacher-challenges__empty">Você ainda não criou nenhum desafio.</p>
      )}

      {challenges !== null && challenges.length > 0 && (
        <ul className="teacher-challenges__list">
          {challenges.map((challenge) => (
            <li key={challenge.id} className="teacher-challenges__item">
              <span className="teacher-challenges__item-icon" aria-hidden="true">
                {challenge.templateIcon}
              </span>
              <span className="teacher-challenges__item-body">
                <span className="teacher-challenges__item-title">{challenge.title}</span>
                <span className="teacher-challenges__item-meta">Template: {challenge.templateName}</span>
              </span>
              <span className="teacher-challenges__item-actions">
                <LinkButton to={`/teacher/challenges/${challenge.id}/edit`} variant="secondary" icon="✏️">
                  Editar
                </LinkButton>
                <LinkButton
                  to={`/teacher/challenges/new?fromChallengeId=${challenge.id}`}
                  variant="secondary"
                  icon="🧬"
                >
                  Duplicar
                </LinkButton>
                <Button variant="ghost" icon="🗑️" onClick={() => setPendingDeleteId(challenge.id)}>
                  Excluir
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Excluir este desafio?"
        description="Os alunos que já acessaram este desafio por link direto deixam de conseguir abri-lo. Esta ação não pode ser desfeita."
      >
        <Button
          variant="secondary"
          disabled={deleting}
          onClick={async () => {
            await confirmDelete();
            setPendingDeleteId(null);
            reload();
          }}
        >
          {deleting ? 'Excluindo…' : 'Excluir mesmo assim'}
        </Button>
      </Dialog>
    </main>
  );
}
