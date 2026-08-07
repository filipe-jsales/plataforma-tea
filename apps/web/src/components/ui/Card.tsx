import { useRef, type ReactNode } from 'react';
import { mergeProps, useButton, useFocusRing } from 'react-aria';
import './Card.css';

export interface SelectableCardProps {
  // Decorativo — nunca substitui `children` (o texto).
  icon?: ReactNode;
  children: ReactNode;
  selected?: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

// 3.10 — cartão de desafio/tópico selecionável. Radix não tem um primitivo
// de "cartão clicável" (não é dialog/tooltip/toggle/tabs); um <div> com
// onClick sozinho não ganha teclado (Enter/Espaço) nem o papel de botão de
// graça, então aqui é onde o React Aria entra: `useButton` dá o
// comportamento completo de um <button> nativo a um elemento que
// visualmente precisa ser um card, e `useFocusRing` distingue foco por
// teclado de foco por clique de mouse (o anel só aparece pra quem navega
// por teclado, sem "pular" visualmente a cada clique de mouse).
export function SelectableCard({ icon, children, selected = false, onSelect, disabled }: SelectableCardProps) {
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
      <span className="ui-card__label">{children}</span>
      {/* Redundância textual da seleção — nunca só a borda/cor de destaque. */}
      {selected && (
        <span className="ui-card__selected-badge" aria-hidden="true">
          ✓ Selecionado
        </span>
      )}
    </div>
  );
}
