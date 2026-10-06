import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import './Dialog.css';
import { Button } from './Button';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  headerClassName?: string;
  children?: ReactNode;
  trigger?: ReactNode;
}

// 3.10 — base modal. Nenhuma tela do MVP usa isto ainda (a Ajuda de 3.5 é
// um painel inline, não modal) — nasce aqui pronta pra quando uma tela
// precisar (ex.: confirmação antes de uma ação difícil de reverter), um dos
// 4 primitivos que a decisão técnica do card cobre (dialog/tooltip/toggle/
// tabs). Sem animação de entrada/saída própria (Dialog.css não declara
// nenhuma) — Radix é headless, não faz isso sozinho.
export function Dialog({ open, onOpenChange, title, description, headerClassName, children, trigger }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-dialog__overlay" />
        <DialogPrimitive.Content className="ui-dialog__content">
          <div className={`ui-dialog__header ${headerClassName ?? ''}`}>
            <DialogPrimitive.Title className="ui-dialog__title">{title}</DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="ui-dialog__description">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          {children}
          <DialogPrimitive.Close asChild>
            <Button type="button" className="ui-dialog__close">
              <span aria-hidden="true"></span> Fechar
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
