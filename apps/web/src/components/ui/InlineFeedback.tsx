import type { ReactNode } from 'react';
import './InlineFeedback.css';
import { Check, Info, Repeat } from 'lucide-react';

export type FeedbackKind = 'success' | 'retry' | 'info';

const DEFAULT_ICON: Record<FeedbackKind, ReactNode> = {
  success: <Check />,
  retry: <Repeat />,
  info: <Info />,
};

export interface InlineFeedbackProps {
  kind: FeedbackKind;
  children: ReactNode;
  // Sobrescreve o ícone padrão do `kind` - continua obrigatoriamente
  // presente, nunca ausente (não existe modo "só texto" nem "só ícone").
  icon?: ReactNode;
}

// 3.10 - feedback de tentativa/resultado, construído pra tornar impossível
// repetir o erro que a regra não-negociável 4 proíbe: nunca "errado"/X
// vermelho isolado. `kind` decide a cor (Feedback.css), mas o ícone (padrão
// por `kind`, redundante com a cor) é sempre renderizado - ver
// ChallengePage.tsx pro uso real hoje (`challenge-page__feedback--retry`),
// candidato a migrar pra este componente quando essa tela for tocada de
// novo (ver nota de débito em frontend.md).
export function InlineFeedback({ kind, children, icon }: InlineFeedbackProps) {
  return (
    <p className={`ui-feedback ui-feedback--${kind}`} role={kind === 'retry' ? 'status' : undefined}>
      <span className="ui-feedback__icon" aria-hidden="true">
        {icon ?? DEFAULT_ICON[kind]}
      </span>
      <span className="ui-feedback__text">{children}</span>
    </p>
  );
}
