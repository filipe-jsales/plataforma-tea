import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import type {
  ChallengeTemplateDetail,
  ChallengeTemplateSummary,
  TeacherChallengeDetail,
} from "../../lib/challengeTemplateTypes";
import {
  Badge,
  Button,
  GuidedTour,
  LinkButton,
  SelectableCard,
} from "../../components/ui";
import { CONTENT_CATEGORY_LABEL } from "../../lib/contentCategory";
import {
  CHALLENGE_FORM_TOUR_KEY,
  CHALLENGE_FORM_TOUR_STEPS,
} from "../../lib/teacherChallengeFormTour";
import { useGuidedTourStore } from "../../stores/useGuidedTourStore";
import { TemplateChallengeForm } from "../../components/template-form/TemplateChallengeForm";
import { ChallengeCreationSurvey } from '../../components/survey/ChallengeCreationSurvey';
import "./TeacherChallengeNew.css";
import { CircleQuestionMark } from "lucide-react";

// 4.2 (AC1/AC2) - "Criar desafio": galeria de templates em linguagem
// pedagógica simples (nome, ícone, descrição - nunca o blockType técnico),
// seguida do formulário guiado do template escolhido. `fromChallengeId`
// (query string) é o mecanismo de duplicação (AC6): pré-seleciona o mesmo
// template e pré-preenche os mesmos parâmetros de um desafio já existente,
// nunca copia `Challenge.config` bruto.
export function TeacherChallengeNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromChallengeId = searchParams.get("fromChallengeId");

  const [templates, setTemplates] = useState<ChallengeTemplateSummary[] | null>(
    null,
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [templateDetail, setTemplateDetail] =
    useState<ChallengeTemplateDetail | null>(null);
  const [sourceChallenge, setSourceChallenge] =
    useState<TeacherChallengeDetail | null>(null);
  const [sourceLoading, setSourceLoading] = useState(Boolean(fromChallengeId));
  // Preenchido só depois que o `POST` de criação já teve sucesso - vira o
  // gatilho pro survey de pesquisa (ChallengeCreationSurvey) substituir o
  // formulário na tela, ANTES de navegar pra "Meus desafios" (ver
  // `handleSubmit`/render abaixo). `null` = ainda não criou (mostra o
  // formulário) ou o survey já foi respondido/recusado (nesse ponto já
  // navegou embora, então nunca re-renderiza com isto true de novo).
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const hasSeenTour = useGuidedTourStore((state) => state.hasSeenTour);
  const markTourSeen = useGuidedTourStore((state) => state.markTourSeen);

  // Abre sozinho na PRIMEIRA vez que o professor chega no formulário guiado
  // (nunca antes - os alvos do tour só existem no DOM depois que
  // `TemplateChallengeForm` renderiza, ver ids `template-challenge-form-*`
  // lá). Da segunda vez em diante fica quieto (`hasSeenTour`,
  // useGuidedTourStore) - nunca interromper quem já sabe usar a tela; o
  // link "❔ Rever tutorial" abaixo sempre reabre manualmente.
  useEffect(() => {
    if (templateDetail && !hasSeenTour(CHALLENGE_FORM_TOUR_KEY)) {
      setTourOpen(true);
    }
  }, [templateDetail, hasSeenTour]);

  function handleTourOpenChange(open: boolean) {
    setTourOpen(open);
    if (!open) markTourSeen(CHALLENGE_FORM_TOUR_KEY);
  }

  useEffect(() => {
    apiClient
      .get<ChallengeTemplateSummary[]>("/challenge-templates")
      .then(setTemplates);
  }, []);

  useEffect(() => {
    if (!fromChallengeId) return;
    apiClient
      .get<TeacherChallengeDetail>(`/teacher/challenges/${fromChallengeId}`)
      .then((source) => {
        setSourceChallenge(source);
        setSelectedTemplateId(source.templateId);
      })
      .finally(() => setSourceLoading(false));
  }, [fromChallengeId]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setTemplateDetail(null);
      return;
    }
    setTemplateDetail(null);
    apiClient
      .get<ChallengeTemplateDetail>(
        `/challenge-templates/${selectedTemplateId}`,
      )
      .then(setTemplateDetail);
  }, [selectedTemplateId]);

  async function handleSubmit(input: {
    title: string;
    params: Record<string, unknown>;
    feedbackMessages: { retry: string; success: string };
    predictQuestion: string;
    investigationQuestion: string;
  }) {
    if (!templateDetail) return;
    const created = await apiClient.post<{ id: string }>(
      `/challenge-templates/${templateDetail.id}/challenges`,
      input,
    );
    // Nunca navega direto - o survey de pesquisa (7.6) entra ANTES,
    // substituindo o formulário na tela; só `onDone` do survey (responder
    // OU recusar) navega de verdade (ver render abaixo).
    setCreatedChallengeId(created.id);
  }

  return (
    <main className="teacher-challenge-new staff-theme page page--narrow">
      <LinkButton to="/teacher/challenges" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Criar desafio</h1>

      {createdChallengeId && (
        <ChallengeCreationSurvey
          challengeId={createdChallengeId}
          onDone={() => navigate('/teacher/challenges')}
        />
      )}

      {!createdChallengeId && !selectedTemplateId && (
        <>
          <p className="teacher-challenge-new__subtitle">
            Escolha um template pronto. Você só ajusta os parâmetros do desafio, nunca precisa mexer em blocos ou código.
          </p>

          {sourceLoading && <p>Carregando desafio de origem…</p>}
          {templates === null && <p>Carregando templates…</p>}
          {templates !== null && templates.length === 0 && (
            <p>Nenhum template disponível ainda para esta disciplina.</p>
          )}

          {templates !== null && templates.length > 0 && (
            <div className="teacher-challenge-new__gallery">
              {templates.map((template) => (
                <SelectableCard
                  key={template.id}
                  icon={template.icon}
                  align="start"
                  meta={
                    <>
                      {template.description}{" "}
                      <Badge variant="neutral">
                        {CONTENT_CATEGORY_LABEL[template.category]}
                      </Badge>
                    </>
                  }
                  onSelect={() => setSelectedTemplateId(template.id)}
                >
                  {template.name}
                </SelectableCard>
              ))}
            </div>
          )}
        </>
      )}

      {!createdChallengeId && selectedTemplateId && templateDetail && (
        <>
          <div className="teacher-challenge-new__form-header">
            <h2>
              <span aria-hidden="true">{templateDetail.icon}</span>{" "}
              {templateDetail.name}
            </h2>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTourOpen(true)}
            >
              <CircleQuestionMark /> Rever tutorial
            </Button>
          </div>
          {/* CC1 - categoria só leitura (curada via seed/Topic.category,
              nunca escolhida pelo professor aqui). */}
          <Badge variant="neutral">
            {CONTENT_CATEGORY_LABEL[templateDetail.category]}
          </Badge>
          <TemplateChallengeForm
            template={templateDetail}
            initialTitle={
              sourceChallenge ? `${sourceChallenge.title} (cópia)` : undefined
            }
            initialParams={sourceChallenge?.params}
            initialFeedbackMessages={sourceChallenge?.feedbackMessages}
            initialPredictQuestion={sourceChallenge?.predictQuestion}
            initialInvestigationQuestion={
              sourceChallenge?.investigationQuestion
            }
            submitLabel="Salvar desafio"
            onSubmit={handleSubmit}
          />
          <GuidedTour
            steps={CHALLENGE_FORM_TOUR_STEPS}
            open={tourOpen}
            onOpenChange={handleTourOpenChange}
          />
        </>
      )}

      {!createdChallengeId && selectedTemplateId && !templateDetail && <p>Carregando formulário…</p>}
    </main>
  );
}
