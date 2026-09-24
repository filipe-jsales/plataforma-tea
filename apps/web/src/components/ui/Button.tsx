import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  // Decorativo — nunca substitui `children` (o texto), só acompanha (AC
  // "rótulo redundante ícone + texto — nunca só ícone").
  icon?: ReactNode;
  className?: string;
}

// 3.10 — base de todo botão da área do aluno, construída sobre um <button>
// nativo (não precisa de useButton do React Aria aqui: o elemento já é o
// nativo e já tem o comportamento de teclado/foco correto por padrão;
// React Aria entra em components/ui só onde o elemento NÃO é nativamente
// interativo, ver Card.tsx). Área de toque mínima 56×56 e foco visível vêm
// de Button.css, nunca de estilo inline calculado aqui — um único lugar pra
// auditar. Nasce sem transição/animação (Button.css não declara nenhuma).
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', icon, children, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={['ui-button', `ui-button--${variant}`, className].filter(Boolean).join(' ')}
      {...rest}
      
    >
      {icon && (
        <span className="ui-button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ui-button__label">{children}</span>
    </button>
  );
});
