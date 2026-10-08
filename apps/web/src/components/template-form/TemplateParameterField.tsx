import { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { InlineFeedback, SegmentedControl, ToggleSwitch } from '../ui';
import { toggleBlockType } from '../../lib/templateParameterForm';
import type { TemplateParameterDefinition } from '../../lib/challengeTemplateTypes';
import { AngleWedgeIcon } from './AngleWedgeIcon';
import { PolygonPreviewIcon } from './PolygonPreviewIcon';
import { ToleranceGaugeIcon } from './ToleranceGaugeIcon';
import './TemplateParameterField.css';

export interface TemplateParameterFieldProps {
  definition: TemplateParameterDefinition;
  value: unknown;
  error?: string;
  onChange: (value: number | boolean | string | string[]) => void;
}

// AC2 - "exemplo visual inline do efeito daquele parâmetro": dispatch só por
// `visualPreview` (nunca por nome de parâmetro), então um template novo
// ganha miniatura reaproveitando um dos três tipos já existentes, ou exige
// só mais um `case` aqui + 1 componente novo - nunca reabrir este
// formulário inteiro.
function renderVisualPreview(definition: TemplateParameterDefinition, value: unknown) {
  switch (definition.visualPreview) {
    case 'polygonSides':
      return <PolygonPreviewIcon sides={Number(value)} />;
    case 'angleWedge':
      return <AngleWedgeIcon angleDeg={Number(value)} />;
    case 'toleranceGauge':
      return <ToleranceGaugeIcon percent={Number(value)} />;
    default:
      return null;
  }
}

// 4.2 - um campo do formulário guiado, renderizado só a partir de
// `definition.type`/`visualPreview` (nunca por nome de parâmetro
// hardcoded, ver nota de pesquisa em ChallengeTemplatesService no backend)
// - é o que torna um template novo "funcionar sem refazer o formulário do
// zero". Rótulo sempre ícone+texto (AC2, regra não-negociável 9 do
// mapeamento - acessibilidade de interface); erro de validação sempre em
// linguagem pedagógica, nunca um asterisco vermelho sozinho.
export function TemplateParameterField({ definition, value, error, onChange }: TemplateParameterFieldProps) {
  const fieldId = `template-param-${definition.key}`;
  // Id separado do `fieldId` do controle interno (`<input id={fieldId}>`
  // já existe pro tipo integer/percentage) - dois elementos com o mesmo id
  // no DOM quebraria `document.getElementById`. `tabIndex={-1}` não entra
  // na ordem normal de tab (o controle interno continua tabável do jeito de
  // sempre) - serve só pra permitir `document.getElementById(wrapperId)
  // ?.focus()` depois de uma validação falhar
  // (TemplateChallengeForm#focusFirstInvalidField), sem precisar de um ref
  // por tipo de controle (número/toggle/segmented control cada um foca
  // diferente).
  const wrapperId = `template-param-field-${definition.key}`;
  const preview = renderVisualPreview(definition, value);
  const isBlockSelection = definition.type === 'blockSelection';
  // A explicação só aparece quando a pessoa pede (botão "?"), pra não
  // despejar texto em todos os campos de uma vez.
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = `${wrapperId}-help`;

  return (
    <fieldset
      id={wrapperId}
      tabIndex={-1}
      className="template-parameter-field"
      data-invalid={error ? 'true' : undefined}
    >
      <legend className="template-parameter-field__header">
        <span className="template-parameter-field__icon" aria-hidden="true">
          {definition.icon}
        </span>
        <span className="template-parameter-field__label">{definition.label} <span className="template-challenge-form__required" aria-hidden="true">*</span>
 </span>
        {definition.helpText && (
          <button
            type="button"
            className="template-parameter-field__help-toggle"
            aria-label={`Explicação: ${definition.label}`}
            aria-expanded={helpOpen}
            aria-controls={helpId}
            onClick={() => setHelpOpen((open) => !open)}
          >
            <CircleHelp aria-hidden="true" size={20} strokeWidth={2} />
          </button>
        )}
      </legend>

      {definition.helpText && helpOpen && (
        <p id={helpId} className="template-parameter-field__help">
          {definition.helpText}
        </p>
      )}

      <div className="template-parameter-field__control-row">
        <div className="template-parameter-field__control">
          {definition.type === 'integer' && (
            <input
              id={fieldId}
              type="number"
              min={definition.min}
              max={definition.max}
              value={Number(value)}
              onChange={(event) => onChange(Number(event.target.value))}
              aria-label={definition.label}
            />
          )}

          {definition.type === 'percentage' && (
            <div className="template-parameter-field__percentage">
              <input
                id={fieldId}
                type="range"
                min={definition.min ?? 0}
                max={definition.max ?? 100}
                value={Number(value)}
                onChange={(event) => onChange(Number(event.target.value))}
                aria-label={definition.label}
              />
              <span className="template-parameter-field__percentage-value">{Number(value)}%</span>
            </div>
          )}

          {definition.type === 'boolean' && (
            <ToggleSwitch
              id={fieldId}
              label={definition.label}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(checked)}
            />
          )}

          {definition.type === 'select' && (
            <SegmentedControl
              ariaLabel={definition.label}
              value={String(value)}
              onValueChange={onChange}
              options={definition.options ?? []}
            />
          )}

          {isBlockSelection && (
            <div className="template-parameter-field__block-list">
              {(definition.options ?? []).length === 0 && (
                <p className="template-parameter-field__empty">
                  Nenhum bloco disponível ainda para este módulo - apresente um bloco novo num desafio de
                  introdução antes de usá-lo aqui.
                </p>
              )}
              {(definition.options ?? []).map((option) => {
                const selected = Array.isArray(value) && value.includes(option.value);
                return (
                  <ToggleSwitch
                    key={option.value}
                    id={`${fieldId}-${option.value}`}
                    label={option.label}
                    checked={selected}
                    onCheckedChange={(checked) => onChange(toggleBlockType(value, option.value, checked))}
                  />
                );
              })}
            </div>
          )}
        </div>

        {preview && (
          <div className="template-parameter-field__preview" aria-hidden="true">
            {preview}
          </div>
        )}
      </div>

      {error && <InlineFeedback kind="retry">{error}</InlineFeedback>}
    </fieldset>
  );
}
