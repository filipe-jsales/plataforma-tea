import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import type { ChallengeTemplateDetail, TeacherChallengeDetail } from '../../lib/challengeTemplateTypes';
import { LinkButton } from '../../components/ui';
import { TemplateChallengeForm } from '../../components/template-form/TemplateChallengeForm';
import './TeacherChallengeNew.css';

// 4.2 (AC5) — edição: abre no MESMO formulário guiado da criação, com os
// valores pré-preenchidos (`challenge.params`) — nunca um editor bruto de
// `Challenge.config`. `templateKey` só decide QUAL formulário buscar
// (`GET /challenge-templates/:templateId`); o desafio em si continua sendo
// identificado por id (`PATCH /teacher/challenges/:id`).
export function TeacherChallengeEdit() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<TeacherChallengeDetail | null>(null);
  const [templateDetail, setTemplateDetail] = useState<ChallengeTemplateDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!challengeId) return;
    apiClient
      .get<TeacherChallengeDetail>(`/teacher/challenges/${challengeId}`)
      .then(setChallenge)
      .catch(() => setNotFound(true));
  }, [challengeId]);

  useEffect(() => {
    if (!challenge) return;
    apiClient.get<ChallengeTemplateDetail>(`/challenge-templates/${challenge.templateId}`).then(setTemplateDetail);
  }, [challenge]);

  async function handleSubmit(input: {
    title: string;
    params: Record<string, unknown>;
    feedbackMessages: { retry: string; success: string };
  }) {
    if (!challengeId) return;
    await apiClient.patch(`/teacher/challenges/${challengeId}`, input);
    navigate('/teacher/challenges');
  }

  return (
    <main className="teacher-challenge-new staff-theme page">
      <LinkButton to="/teacher/challenges" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Editar desafio</h1>

      {notFound && <p>Este desafio não existe mais ou não pertence a você.</p>}
      {!notFound && (!challenge || !templateDetail) && <p>Carregando…</p>}

      {challenge && templateDetail && (
        <>
          <h2>
            <span aria-hidden="true">{templateDetail.icon}</span> {templateDetail.name}
          </h2>
          <TemplateChallengeForm
            template={templateDetail}
            initialTitle={challenge.title}
            initialParams={challenge.params}
            initialFeedbackMessages={challenge.feedbackMessages}
            submitLabel="Salvar alterações"
            onSubmit={handleSubmit}
          />
        </>
      )}
    </main>
  );
}
