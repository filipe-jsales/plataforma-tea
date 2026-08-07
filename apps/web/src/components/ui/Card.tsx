import { useRef, type ReactNode } from 'react';
import { mergeProps, useButton, useFocusRing } from 'react-aria';
import './Card.css';

export type SelectableCardAlign = 'center' | 'start';

export interface SelectableCardProps {
  // Decorativo — nunca substitui `children` (o texto).
  icon?: ReactNode;
  children: ReactNode;
  // 3.11 — metadado secundário (ex.: "Código: AZUL-1 · 12 alunos ativos"),
  // sempre num nível tipográfico abaixo do título (AC "hierarquia clara
  // entre título da turma e metadado — nunca tudo no mesmo nível visual").
  meta?: ReactNode;
  // 'center' (padrão, aluno — ícone grande em cima, ver SubjectSelector) ou
  // 'start' (staff — título+meta empilhados à esquerda, ver
  // TeacherMetrics/AdminMetrics). Mesmo componente, só o arranjo do
  // conteúdo muda — a fundação (useButton/useFocusRing, seleção, foco) é
  // idêntica nos dois.
  align?: SelectableCardAlign;
  selected?: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

// 3.10/3.11 — cartão selecionável (tópico/desafio do aluno; turma/escola de
// professor/admin). Radix não tem um primitivo de "cartão clicável" (não é
// dialog/tooltip/toggle/tabs); um <div> com onClick sozinho não ganha
// teclado (Enter/Espaço) nem o papel de botão de graça, então aqui é onde o
// React Aria entra: `useButton` dá o comportamento completo de um <button>
// nativo a um elemento que visualmente precisa ser um card, e
// `useFocusRing` distingue foco por teclado de foco por clique de mouse (o
// anel só aparece pra quem navega por teclado). Elevação (sombra) é 100%
// tema — vem de `var(--shadow-card)`, `none` fora de `.staff-theme` (ver
// Card.css/theme/staff-theme.css) — o componente não sabe em qual módulo
// está sendo usado.
export function SelectableCard({
  icon,
  children,
  meta,
  align = 'center',
  selected = false,
  onSelect,
  disabled,
}: SelectableCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { buttonProps, isPressed } = useButton(
    { elementType: 'div', onPress: onSelect, isDisabled: disabled },
    ref,
  );
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <div
      {...mergeProps(buttonProps, focusProps)}
      ref={ref}
      aria-pressed={selected}
      className={[
        'ui-card',
        `ui-card--align-${align}`,
        selected && 'ui-card--selected',
        isPressed && 'ui-card--pressed',
        isFocusVisible && 'ui-card--focus-visible',
        disabled && 'ui-card--disabled',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && (
        <span className="ui-card__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ui-card__body">
        <span className="ui-card__label">{children}</span>
        {meta && <span className="ui-card__meta">{meta}</span>}
      </span>
      {/* Redundância textual da seleção — nunca só a borda/cor de destaque. */}
      {selected && (
        <span className="ui-card__selected-badge" aria-hidden="true">
          ✓ Selecionado
        </span>
      )}
    </div>
  );
}
