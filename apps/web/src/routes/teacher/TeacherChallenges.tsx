import { useEffect, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import type { TeacherChallengeSummary } from "../../lib/challengeTemplateTypes";
import { Button, Dialog, LinkButton } from "../../components/ui";
import { AllocationDialog } from "./AllocationDialog";
import "./TeacherChallenges.css";
import { CirclePlus, Dna, Pencil, School, Trash } from "lucide-react";

// 4.2 (AC5) - "Meus desafios": lista só os desafios que O PRÓPRIO professor
// criou via template. Nenhuma ação aqui (editar/duplicar/excluir/alocar)
// expõe `Challenge.config`/estrutura de blocos - editar e duplicar reabrem
// exatamente o mesmo formulário guiado da criação (ver TeacherChallengeForm
// route), nunca um editor bruto. "Alocar à turma" (4.3) é o que decide se
// o desafio chega a algum aluno - sem alocação, o desafio fica só aqui,
// nunca vaza pra área de nenhum aluno (AC3 de 4.3).
export function TeacherChallenges() {
  const [challenges, setChallenges] = useState<
    TeacherChallengeSummary[] | null
  >(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [allocatingChallenge, setAllocatingChallenge] =
    useState<TeacherChallengeSummary | null>(null);

  function reload() {
    setChallenges(null);
    apiClient
      .get<TeacherChallengeSummary[]>("/teacher/challenges")
      .then(setChallenges);
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
        Desafios que você criou escolhendo um template pronto e ajustando só os
        parâmetros.
      </p>

      <LinkButton to="/teacher/challenges/new" icon={<CirclePlus />}>
        Criar desafio
      </LinkButton>

      {challenges === null && (
        <p className="teacher-challenges__loading">Carregando…</p>
      )}
      {challenges !== null && challenges.length === 0 && (
        <p className="teacher-challenges__empty" style={{ marginTop: "0.5em" }}>
          Você ainda não criou nenhum desafio.
        </p>
      )}

      {challenges !== null && challenges.length > 0 && (
        <ul className="teacher-challenges__list">
          {challenges.map((challenge) => (
            <li key={challenge.id} className="teacher-challenges__item">
              <span
                className="teacher-challenges__item-icon"
                aria-hidden="true"
              >
                {challenge.templateIcon}
              </span>
              <span className="teacher-challenges__item-body">
                <span className="teacher-challenges__item-title">
                  {challenge.title}
                </span>
                <span className="teacher-challenges__item-meta">
                  Template: {challenge.templateName}
                </span>
              </span>
              <span className="teacher-challenges__item-actions">
                <Button
                  variant="secondary"
                  icon={<School />}
                  onClick={() => setAllocatingChallenge(challenge)}
                >
                  Alocar à turma
                </Button>
                <LinkButton
                  to={`/teacher/challenges/${challenge.id}/edit`}
                  variant="secondary"
                  icon={<Pencil />}
                >
                  Editar
                </LinkButton>
                <LinkButton
                  to={`/teacher/challenges/new?fromChallengeId=${challenge.id}`}
                  variant="secondary"
                  icon={<Dna />}
                >
                  Duplicar
                </LinkButton>
                <Button
                  variant="danger"
                  icon={<Trash />}
                  onClick={() => setPendingDeleteId(challenge.id)}
                >
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
          variant="danger"
          disabled={deleting}
          onClick={async () => {
            await confirmDelete();
            setPendingDeleteId(null);
            reload();
          }}
        >
          {deleting ? "Excluindo…" : "Excluir mesmo assim"}
        </Button>
      </Dialog>

      {allocatingChallenge && (
        <AllocationDialog
          challengeId={allocatingChallenge.id}
          challengeTitle={allocatingChallenge.title}
          open={allocatingChallenge !== null}
          onOpenChange={(open) => !open && setAllocatingChallenge(null)}
        />
      )}
    </main>
  );
}
