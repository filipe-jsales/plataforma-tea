import { useEffect } from 'react';
import { InlineFeedback, type FeedbackKind } from './InlineFeedback';
import './Toast.css';

export interface ToastProps {
  kind: FeedbackKind;
  children: React.ReactNode;
  onDismiss: () => void;
  // `0` desliga o auto-dismiss (ex.: um aviso que o professor precisa ler
  // com calma) — default 8s é generoso o bastante pra ler uma frase de
  // validação sem precisar reagir rápido (RQ4, coordenação motora fina).
  autoDismissMs?: number;
}

// Aviso flutuante e transitório — nunca a única fonte da mensagem (o campo
// com erro sempre mostra a mesma frase ao lado, ver TemplateParameterField/
// TextField `error`): o Toast existe só pra garantir que o professor VEJA
// que algo precisa de atenção, mesmo quando o campo problemático está fora
// da área visível da tela (formulário guiado pode ter vários campos). Reusa
// InlineFeedback pro par ícone+cor (regra não-negociável 4 — nunca só
// "erro"/X vermelho), só acrescenta posicionamento fixo + botão de fechar.
export function Toast({ kind, children, onDismiss, autoDismissMs = 8000 }: ToastProps) {
  useEffect(() => {
    if (!autoDismissMs) return;
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  return (
    <div className="ui-toast" role="alert">
      <InlineFeedback kind={kind}>{children}</InlineFeedback>
      <button type="button" className="ui-toast__dismiss" onClick={onDismiss} aria-label="Fechar aviso">
        ✕
      </button>
    </div>
  );
}
