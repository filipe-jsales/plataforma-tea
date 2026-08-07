import { forwardRef, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import type { ButtonVariant } from './Button';
import './Button.css';

export interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  // Decorativo — nunca substitui `children` (o texto).
  icon?: ReactNode;
}

// 3.11 — "← Voltar" deixa de ser link de texto solto (AC dos prints) e
// qualquer navegação (não ação) reaproveita a MESMA geometria visual do
// Button (`.ui-button`/`.ui-button--*` de Button.css: raio de borda, área
// de toque, tipografia) — só o elemento HTML muda (<a> de react-router em
// vez de <button>, porque navegação é link, não ação de formulário/JS). AC
// "consistência entre módulos": o botão "Entrar" (Button, elemento
// <button>) e "← Voltar" (LinkButton, elemento <a>) nascem visualmente
// idênticos porque compartilham a mesma classe CSS, nunca 2 implementações
// de botão divergentes.
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
  { variant = 'primary', icon, children, className, ...rest },
  ref,
) {
  return (
    <Link
      ref={ref}
      className={['ui-button', `ui-button--${variant}`, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon && (
        <span className="ui-button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ui-button__label">{children}</span>
    </Link>
  );
});
