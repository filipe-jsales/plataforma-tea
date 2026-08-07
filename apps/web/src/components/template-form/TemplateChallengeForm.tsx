import { useMemo, useState } from 'react';
import { PixiTurtleWorld } from '../challenge/PixiTurtleWorld';
import { apiClient } from '../../lib/apiClient';
import { buildGoalPreviewPath } from '../../lib/turtleWorld';
import { buildInitialParams, errorsByParameterKey } from '../../lib/templateParameterForm';
import { createTurtleExecutionStore } from '../../stores/turtleExecutionStore';
import type {
  ChallengeTemplateDetail,
  TemplateParamsDraft,
  TemplatePreviewResult,
} from '../../lib/challengeTemplateTypes';
import { Button, InlineFeedback } from '../ui';
import { TemplateParameterField } from './TemplateParameterField';
import './TemplateChallengeForm.css';

export interface TemplateChallengeFormSubmitInput {
  title: string;
  params: TemplateParamsDraft;
}

export interface TemplateChallengeFormProps {
  template: ChallengeTemplateDetail;
  initialTitle?: string;
  initialParams?: TemplateParamsDraft;
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
  initialTitle = '',
  initialParams,
  submitLabel,
  onSubmit,
}: TemplateChallengeFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [params, setParams] = useState<TemplateParamsDraft>(
    () => initialParams ?? buildInitialParams(template.parameterSchema),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChecking, setPreviewChecking] = useState(false);

  const previewStore = useMemo(() => createTurtleExecutionStore(), []);

  function handleParamChange(key: string, value: number | boolean | string[]) {
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
    return apiClient.post<TemplatePreviewResult>(`/challenge-templates/${template.id}/preview`, { params });
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
        setFieldErrors(errorsByParameterKey(result.errors));
        setPreviewOpen(false);
        return;
      }
      setFieldErrors({});
      const path = buildGoalPreviewPath({ sides: result.goal.sides, turnAngleDeg: result.goal.turnAngleDeg });
      // Preview é sempre animado (independente do perfil sensorial do
      // PRÓPRIO professor): o objetivo aqui é uma demonstração rápida de
      // como o desenho fica, não a experiência sensorial de um aluno
      // específico — cada aluno real continua vendo o desafio de acordo
      // com o próprio perfil, isto é só a tela de autoria.
      previewStore.getState().play(path.points, true);
      setPreviewOpen(true);
    } finally {
      setPreviewChecking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setFormError('Dê um nome para o desafio antes de salvar.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const result = await runValidation();
      if (!result.valid) {
        // AC3 — bloqueia o salvamento, mensagem descritiva sob cada campo,
        // nunca um erro genérico solto no topo da tela.
        setFieldErrors(errorsByParameterKey(result.errors));
        return;
      }
      setFieldErrors({});
      await onSubmit({ title: title.trim(), params });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="template-challenge-form" onSubmit={handleSubmit}>
      <label className="template-challenge-form__title-field">
        <span>✏️ Nome do desafio</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Triângulos e seus ângulos"
          maxLength={150}
        />
      </label>

      <div className="template-challenge-form__fields">
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

      {formError && <InlineFeedback kind="retry">{formError}</InlineFeedback>}

      <div className="template-challenge-form__actions">
        <Button type="button" variant="secondary" onClick={handleVisualize} disabled={previewChecking}>
          {previewChecking ? 'Verificando…' : '👀 Visualizar como aluno'}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : submitLabel}
        </Button>
      </div>

      {previewOpen && (
        <div className="template-challenge-form__preview-panel">
          <p>É assim que o desenho aparece para o aluno, com os valores atuais.</p>
          <PixiTurtleWorld store={previewStore} />
        </div>
      )}
    </form>
  );
}
