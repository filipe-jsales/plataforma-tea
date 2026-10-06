import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import './IconButton.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  icon: ReactNode;
  // Obrigatório: botão só com ícone nunca fica sem nome acessível.
  label: string;
}

// Botão vazado só com ícone (X de fechar, hambúrguer do menu). A área de
// toque segue 56x56, mas o fundo `--color-primary` do hover é um círculo
// justo em volta do ícone. O nome vem de `label` (aria-label), então quem
// usa não precisa lembrar de rotular.
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={['ui-icon-button', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <span aria-hidden="true" className="ui-icon-button__icon">
        {icon}
      </span>
    </button>
  );
});
