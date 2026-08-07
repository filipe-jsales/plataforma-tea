import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import './Tooltip.css';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

// 3.10 — reforço textual OPCIONAL, nunca a única fonte do rótulo (AC "nunca
// só ícone"): `children` (o gatilho) já precisa ter nome acessível próprio
// (texto visível ou aria-label) por conta dele mesmo; a Tooltip é contexto
// extra pra quem passa o mouse/foca, não uma muleta pra rótulo ausente.
// Cada instância traz seu próprio Provider (delay compartilhado só entre
// Tooltips da mesma árvore) — telas com muitas tooltips lado a lado podem
// envolver a árvore uma vez em <TooltipPrimitive.Provider> pra evitar
// providers aninhados repetidos, mas isso é otimização, não correção.
export function Tooltip({ content, children }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="ui-tooltip" sideOffset={6}>
            {content}
            <TooltipPrimitive.Arrow className="ui-tooltip__arrow" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
