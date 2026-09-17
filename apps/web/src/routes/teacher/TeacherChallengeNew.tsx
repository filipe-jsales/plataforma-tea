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
import "./TeacherChallengeNew.css";
import { CircleQuestionMark } from "lucide-react";

// 4.2 (AC1/AC2) — "Criar desafio": galeria de templates em linguagem
// pedagógica simples (nome, ícone, descrição — nunca o blockType técnico),
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
  const [tourOpen, setTourOpen] = useState(false);
  const hasSeenTour = useGuidedTourStore((state) => state.hasSeenTour);
  const markTourSeen = useGuidedTourStore((state) => state.markTourSeen);

  // Abre sozinho na PRIMEIRA vez que o professor chega no formulário guiado
  // (nunca antes — os alvos do tour só existem no DOM depois que
  // `TemplateChallengeForm` renderiza, ver ids `template-challenge-form-*`
  // lá). Da segunda vez em diante fica quieto (`hasSeenTour`,
  // useGuidedTourStore) — nunca interromper quem já sabe usar a tela; o
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
    await apiClient.post(
      `/challenge-templates/${templateDetail.id}/challenges`,
      input,
    );
    navigate("/teacher/challenges");
  }

  return (
    <main className="teacher-challenge-new staff-theme page">
      <LinkButton to="/teacher/challenges" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Criar desafio</h1>

      {!selectedTemplateId && (
        <>
          <p className="teacher-challenge-new__subtitle">
            Escolha um template pronto. Você só ajusta os parâmetros do desafio
            — nunca precisa mexer em blocos ou código.
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

      {selectedTemplateId && templateDetail && (
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
          {/* CC1 — categoria só leitura (curada via seed/Topic.category,
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

      {selectedTemplateId && !templateDetail && <p>Carregando formulário…</p>}
    </main>
  );
}
