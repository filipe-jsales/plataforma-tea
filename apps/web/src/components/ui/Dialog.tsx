import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import './Dialog.css';
import { Button } from './Button';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  trigger?: ReactNode;
  // Ações de confirmar/negar: sempre no rodapé, centralizadas (ver DialogCancel).
  footer?: ReactNode;
}

// 3.10 - base modal. Nenhuma tela do MVP usa isto ainda (a Ajuda de 3.5 é
// um painel inline, não modal) - nasce aqui pronta pra quando uma tela
// precisar (ex.: confirmação antes de uma ação difícil de reverter), um dos
// 4 primitivos que a decisão técnica do card cobre (dialog/tooltip/toggle/
// tabs). Sem animação de entrada/saída própria (Dialog.css não declara
// nenhuma) - Radix é headless, não faz isso sozinho.
export function Dialog({ open, onOpenChange, title, description, children, trigger, footer }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-dialog__overlay" />
        <DialogPrimitive.Content className="ui-dialog__content">
          <DialogPrimitive.Close asChild>
            <button type="button" className="ui-dialog__close" aria-label="Fechar">
              <X aria-hidden="true" strokeWidth={2} />
            </button>
          </DialogPrimitive.Close>
          <DialogPrimitive.Title className="ui-dialog__title">{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="ui-dialog__description">
              {description}
            </DialogPrimitive.Description>
          )}
          {children}
          {footer && <div className="ui-dialog__footer">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Botão "negar" padrão do rodapé: fecha o modal sem executar a ação.
export function DialogCancel({ children = 'Cancelar' }: { children?: ReactNode }) {
  return (
    <DialogPrimitive.Close asChild>
      <Button type="button" variant="danger">
        {children}
      </Button>
    </DialogPrimitive.Close>
  );
}
