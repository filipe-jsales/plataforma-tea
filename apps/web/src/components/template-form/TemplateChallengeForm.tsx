import { useMemo, useState } from "react";
import { PixiTurtleWorld } from "../challenge/PixiTurtleWorld";
import { apiClient, ApiError } from "../../lib/apiClient";
import { buildGoalPreviewPath } from "../../lib/turtleWorld";
import {
  buildInitialParams,
  errorsByParameterKey,
} from "../../lib/templateParameterForm";
import {
  DEFAULT_RETRY_MESSAGE,
  DEFAULT_SUCCESS_MESSAGE,
} from "../../lib/feedbackMessages";
import { createTurtleExecutionStore } from "../../stores/turtleExecutionStore";
import type {
  ChallengeFeedbackMessagesDraft,
  ChallengeTemplateDetail,
  TemplateParamsDraft,
  TemplatePreviewResult,
} from "../../lib/challengeTemplateTypes";
import { Button, InlineFeedback, TextareaField, TextField, Toast } from "../ui";
import { TemplateParameterField } from "./TemplateParameterField";
import "./TemplateChallengeForm.css";
import { Pencil } from "lucide-react";

// Mapeia a chave de erro (parameterKey do backend) pro id do elemento a
// focar depois de uma validação falhar — cada tipo de campo usa uma
// convenção de id diferente (título é um input cru; perguntas PRIMM/
// mensagens de feedback são TextField/TextareaField, cujo `id` vira o do
// elemento nativo; parâmetro de template usa o wrapper de
// TemplateParameterField, ver a nota lá sobre por que não é o mesmo id do
// controle interno). Chaves de parâmetro do template (`sides`,
// `turnAngleDeg`...) não têm entrada fixa aqui — caem no fallback
// `template-param-field-<key>` de `focusFieldByErrorKey`.
const FIXED_FIELD_ELEMENT_ID: Record<string, string> = {
  title: "challenge-title",
  predictQuestion: "predict-question",
  investigationQuestion: "investigation-question",
  retryMessage: "feedback-retry-message",
  successMessage: "feedback-success-message",
};

// Ordem de leitura da tela (topo → baixo) — usada só pra escolher QUAL
// campo focar primeiro quando mais de um está inválido ao mesmo tempo
// (nunca focar um campo abaixo enquanto um de cima também está errado).
function buildFieldFocusOrder(template: ChallengeTemplateDetail): string[] {
  return [
    "title",
    ...template.parameterSchema.map((definition) => definition.key),
    "predictQuestion",
    "investigationQuestion",
    "retryMessage",
    "successMessage",
  ];
}

function focusFieldByErrorKey(key: string): void {
  const id = FIXED_FIELD_ELEMENT_ID[key] ?? `template-param-field-${key}`;
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.focus();
}

export interface TemplateChallengeFormSubmitInput {
  title: string;
  params: TemplateParamsDraft;
  feedbackMessages: ChallengeFeedbackMessagesDraft;
  predictQuestion: string;
  investigationQuestion: string;
}

export interface TemplateChallengeFormProps {
  template: ChallengeTemplateDetail;
  initialTitle?: string;
  initialParams?: TemplateParamsDraft;
  initialFeedbackMessages?: Partial<ChallengeFeedbackMessagesDraft>;
  // 7.5 (AC3) — vindo do desafio salvo (edição/duplicação); ausente numa
  // criação nova, caso em que o formulário pré-preenche com a sugestão do
  // template (`template.primmQuestionSuggestion`), nunca com string vazia.
  initialPredictQuestion?: string;
  initialInvestigationQuestion?: string;
  submitLabel: string;
  onSubmit: (input: TemplateChallengeFormSubmitInput) => Promise<void>;
}

// 4.2 — o formulário guiado (Modo Template): mesmo componente usado pra
// criar, editar e duplicar (AC5/AC6 — sempre os mesmos campos, nunca um
// editor bruto). Renderiza SÓ a partir de `template.parameterSchema`
// (TemplateParameterField), então um template novo funciona aqui sem
// nenhuma mudança neste arquivo. Em nenhum ponto deste componente um
// `Challenge.config`/estrutura de blocos é lido, editado ou exibido — o
// backend nunca devolve isso pra esta tela (regra não-negociável 9).
export function TemplateChallengeForm({
  template,
  initialTitle = "",
  initialParams,
  initialFeedbackMessages,
  initialPredictQuestion,
  initialInvestigationQuestion,
  submitLabel,
  onSubmit,
}: TemplateChallengeFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [params, setParams] = useState<TemplateParamsDraft>(() =>
    buildInitialParams(template.parameterSchema, initialParams),
  );
  // 3.7 (AC4) — mensagens de feedback opcionais, por desafio. Vazio (não
  // `undefined`) pra o input controlado nunca alternar entre controlado/
  // não-controlado; string vazia significa "usar o default sugerido" tanto
  // aqui quanto no backend (ver sanitizeFeedbackMessages).
  const [feedbackMessages, setFeedbackMessages] =
    useState<ChallengeFeedbackMessagesDraft>(() => ({
      retry: initialFeedbackMessages?.retry ?? "",
      success: initialFeedbackMessages?.success ?? "",
    }));
  // 7.5 — ao contrário de `feedbackMessages` (vazio = "usar default"), aqui
  // vazio nunca é uma opção válida: sem valor salvo (criação nova), o
  // campo já nasce preenchido com a sugestão do template — editável, nunca
  // um placeholder cinza que o professor precisaria apagar pra digitar.
  const [predictQuestion, setPredictQuestion] = useState(
    () =>
      initialPredictQuestion ??
      template.primmQuestionSuggestion.predictQuestion,
  );
  const [investigationQuestion, setInvestigationQuestion] = useState(
    () =>
      initialInvestigationQuestion ??
      template.primmQuestionSuggestion.investigationQuestion,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Aviso flutuante e transitório — some sozinho depois de um tempo (ver
  // Toast.tsx), nunca a única fonte da mensagem: o campo problemático
  // continua mostrando a mesma frase ao lado (fieldErrors) mesmo depois do
  // Toast sumir. Existe especificamente pro caso de um formulário guiado
  // longo, onde o campo com erro pode estar fora da área visível — sem
  // isto, "salvar" parecia não fazer nada (nenhuma mudança visível acima da
  // dobra), quando na verdade um campo obrigatório ficou sem preencher.
  const [toast, setToast] = useState<{ kind: "retry"; message: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChecking, setPreviewChecking] = useState(false);

  const previewStore = useMemo(() => createTurtleExecutionStore(), []);
  const fieldFocusOrder = useMemo(
    () => buildFieldFocusOrder(template),
    [template],
  );

  // Foca (e rola até) o primeiro campo inválido na ordem de leitura da
  // tela — nunca um campo qualquer do mapa (a ordem de iteração de um
  // objeto JS não é garantida ser a ordem visual).
  function focusFirstInvalidField(errors: Record<string, string>) {
    const firstKey = fieldFocusOrder.find((key) => key in errors);
    if (firstKey) focusFieldByErrorKey(firstKey);
  }

  function handleParamChange(
    key: string,
    value: number | boolean | string | string[],
  ) {
    setParams((current) => ({ ...current, [key]: value }));
    // Erros ficam desatualizados assim que qualquer campo muda — nunca
    // deixar uma mensagem de validação de um valor anterior grudada na
    // tela depois que o professor já ajustou o valor.
    setFieldErrors({});
    setFormError(null);
    setPreviewOpen(false);
  }

  // AC3 — validação pedagógica sempre que o professor pede o preview OU
  // tenta salvar: o mesmo endpoint (`/preview`) serve as duas coisas, nunca
  // um "erro de schema" genérico se o backend rejeitar.
  async function runValidation(): Promise<TemplatePreviewResult> {
    return apiClient.post<TemplatePreviewResult>(
      `/challenge-templates/${template.id}/preview`,
      { params },
    );
  }

  // AC4 — "Visualizar como aluno": preview funcional no motor de jogo
  // (Pixi), nunca uma representação de blocos. Reaproveita exatamente o
  // mesmo mecanismo do botão de Ajuda do aluno (buildGoalPreviewPath, ver
  // turtleWorld.ts) — o professor vê a MESMA animação que o aluno veria.
  async function handleVisualize() {
    setPreviewChecking(true);
    setFormError(null);
    try {
      const result = await runValidation();
      if (!result.valid || !result.goal) {
        const errors = errorsByParameterKey(result.errors);
        setFieldErrors(errors);
        setPreviewOpen(false);
        setToast({
          kind: "retry",
          message: "Alguns campos precisam de atenção antes de visualizar.",
        });
        focusFirstInvalidField(errors);
        return;
      }
      setFieldErrors({});
      const path = buildGoalPreviewPath({
        sides: result.goal.sides,
        turnAngleDeg: result.goal.turnAngleDeg,
      });
      // Preview é sempre animado (independente do perfil sensorial do
      // PRÓPRIO professor): o objetivo aqui é uma demonstração rápida de
      // como o desenho fica, não a experiência sensorial de um aluno
      // específico — cada aluno real continua vendo o desafio de acordo
      // com o próprio perfil, isto é só a tela de autoria.
      previewStore.getState().play(path.points, true);
      setPreviewOpen(true);
    } catch (error) {
      // Faltava este `catch`: uma falha de rede/servidor na chamada de
      // `/preview` derrubava a promise sem nenhum feedback — o clique em
      // "Visualizar como aluno" parecia simplesmente não fazer nada.
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a pré-visualização. Tente novamente.";
      setFormError(message);
      setToast({ kind: "retry", message });
    } finally {
      setPreviewChecking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      const message = "Dê um nome para o desafio antes de salvar.";
      setFormError(message);
      setToast({ kind: "retry", message });
      focusFieldByErrorKey("title");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const result = await runValidation();
      if (!result.valid) {
        // AC3 — bloqueia o salvamento, mensagem descritiva sob cada campo,
        // nunca um erro genérico solto no topo da tela.
        const errors = errorsByParameterKey(result.errors);
        setFieldErrors(errors);
        setToast({
          kind: "retry",
          message: "Alguns campos precisam de atenção antes de salvar.",
        });
        focusFirstInvalidField(errors);
        return;
      }
      setFieldErrors({});
      await onSubmit({
        title: title.trim(),
        params,
        feedbackMessages,
        predictQuestion,
        investigationQuestion,
      });
    } catch (error) {
      // 7.5 — validação de pergunta PRIMM/mensagem de feedback só acontece
      // no save de verdade (nunca no `/preview`, ver
      // ChallengeTemplatesService#validateAndBuildConfig), então o backend
      // devolve `errors` estruturado (mesma forma do `/preview`) junto da
      // mensagem combinada — sem isso, o professor via só uma frase solta
      // no rodapé do formulário, fácil de não perceber num form longo.
      if (
        error instanceof ApiError &&
        error.errors &&
        error.errors.length > 0
      ) {
        const errors = errorsByParameterKey(error.errors);
        setFieldErrors((current) => ({ ...current, ...errors }));
        setToast({
          kind: "retry",
          message: "Alguns campos precisam de atenção antes de salvar.",
        });
        focusFirstInvalidField(errors);
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível salvar. Tente novamente.";
        setFormError(message);
        setToast({ kind: "retry", message });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="template-challenge-form" onSubmit={handleSubmit}>
      {/* ids `template-challenge-form-*` são alvo do tutorial guiado
          (GuidedTour, ver TeacherChallengeNew.tsx) — nunca renomear/remover
          sem atualizar `CHALLENGE_FORM_TOUR_STEPS` junto, ou um passo do
          tour aponta pra um elemento que não existe mais. */}
      <label
        id="template-challenge-form-title"
        className="template-challenge-form__title-field"
      >
        <span><Pencil />Nome do desafio</span>
        <input
          id="challenge-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Triângulos e seus ângulos"
          maxLength={150}
        />
      </label>

      <div
        id="template-challenge-form-params"
        className="template-challenge-form__fields"
      >
        {template.parameterSchema.map((definition) => (
          <TemplateParameterField
            key={definition.key}
            definition={definition}
            value={params[definition.key]}
            error={fieldErrors[definition.key]}
            onChange={(value) => handleParamChange(definition.key, value)}
          />
        ))}
      </div>

      {/* 7.5 — perguntas PRIMM (AC1): OBRIGATÓRIAS, ao contrário das
          mensagens de feedback abaixo. Pré-preenchidas com a sugestão do
          template (AC2), sempre editáveis. Sem limite curto de caracteres
          (AC4) — TextareaField acomoda linguagem acessível mais longa. */}
      <div
        id="template-challenge-form-primm"
        className="template-challenge-form__primm-questions"
      >
        <TextareaField
          id="predict-question"
          label="Pergunta de Predição (antes de Executar)"
          value={predictQuestion}
          error={fieldErrors.predictQuestion}
          onChange={(event) => setPredictQuestion(event.target.value)}
        />
        <TextareaField
          id="investigation-question"
          label="Pergunta de Investigação (depois de Executar)"
          value={investigationQuestion}
          error={fieldErrors.investigationQuestion}
          onChange={(event) => setInvestigationQuestion(event.target.value)}
        />
      </div>

      {/* 3.7 (AC4) — mensagens de feedback opcionais, por desafio. Vazio usa
          o conjunto de mensagens-padrão sugeridas (placeholder mostra qual é
          o default, pra o professor nunca digitar do zero sem saber o que
          já está valendo). Nunca aceita linguagem punitiva — o backend
          valida e devolve mensagem pedagógica se a tentativa violar isso
          (regra não-negociável 4, ver feedback-messages.ts). */}
      <div
        id="template-challenge-form-feedback"
        className="template-challenge-form__feedback-messages"
      >
        <TextField
          id="feedback-retry-message"
          label="Mensagem quando o aluno ainda não atingiu o objetivo (opcional)"
          value={feedbackMessages.retry}
          error={fieldErrors.retryMessage}
          placeholder={DEFAULT_RETRY_MESSAGE}
          maxLength={200}
          onChange={(event) =>
            setFeedbackMessages((current) => ({
              ...current,
              retry: event.target.value,
            }))
          }
        />
        <TextField
          id="feedback-success-message"
          label="Mensagem de sucesso (opcional)"
          value={feedbackMessages.success}
          error={fieldErrors.successMessage}
          placeholder={DEFAULT_SUCCESS_MESSAGE}
          maxLength={200}
          onChange={(event) =>
            setFeedbackMessages((current) => ({
              ...current,
              success: event.target.value,
            }))
          }
        />
      </div>

      {formError && <InlineFeedback kind="retry">{formError}</InlineFeedback>}

      {toast && (
        <Toast kind={toast.kind} onDismiss={() => setToast(null)}>
          {toast.message}
        </Toast>
      )}

      <div className="template-challenge-form__actions">
        <Button
          id="template-challenge-form-visualize"
          type="button"
          variant="secondary"
          onClick={handleVisualize}
          disabled={previewChecking}
        >
          {previewChecking ? "Verificando…" : "Visualizar como aluno"}
        </Button>
        <Button
          id="template-challenge-form-submit"
          type="submit"
          disabled={saving}
        >
          {saving ? "Salvando…" : submitLabel}
        </Button>
      </div>

      {previewOpen && (
        <div className="template-challenge-form__preview-panel">
          <p>
            É assim que o desenho aparece para o aluno, com os valores atuais.
          </p>
          <PixiTurtleWorld store={previewStore} />
        </div>
      )}
    </form>
  );
}
