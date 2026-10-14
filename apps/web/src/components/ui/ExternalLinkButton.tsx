import type { AnchorHTMLAttributes, ReactNode } from 'react';
import type { ButtonVariant } from './Button';
import './Button.css';

export interface ExternalLinkButtonProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'target' | 'rel'> {
  href: string;
  variant?: ButtonVariant;
  // Decorativo - nunca substitui `children` (o texto).
  icon?: ReactNode;
}

// Mesma geometria de Button/LinkButton (`.ui-button`), mas para um endereço
// fora do app: <a> comum em nova aba, porque o <Link> do react-router só
// navega dentro da SPA. O texto avisa que abre fora via aria-label do chamador.
export function ExternalLinkButton({ variant = 'primary', icon, children, ...rest }: ExternalLinkButtonProps) {
  return (
    <a className={`ui-button ui-button--${variant}`} target="_blank" rel="noopener noreferrer" {...rest}>
      {icon && (
        <span className="ui-button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="ui-button__label">{children}</span>
    </a>
  );
}
