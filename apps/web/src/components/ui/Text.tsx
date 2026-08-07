import type { ElementType, ReactNode } from 'react';
import './Typography.css';

export type TextTone = 'default' | 'muted' | 'warning' | 'success';
export type TextSize = 'sm' | 'md' | 'lg';

export interface TextProps {
  tone?: TextTone;
  size?: TextSize;
  as?: 'p' | 'span';
  children: ReactNode;
  className?: string;
}

// Texto de corpo/instrução. `tone` muda cor (ex.: `warning` pro aviso "quase
// lá"), mas nunca é o único jeito de comunicar o que está acontecendo — todo
// lugar que usa `tone="warning"`/`"success"` pra feedback de tentativa
// (nunca erro fixo) deve vir acompanhado de ícone, ver InlineFeedback, que
// já embute essa combinação pronta em vez de deixar cada tela reinventar.
export function Text({ tone = 'default', size = 'md', as = 'p', children, className }: TextProps) {
  const Tag = as as ElementType;
  const classes = ['ui-text', `ui-text--${tone}`, `ui-text--${size}`, className].filter(Boolean).join(' ');
  return <Tag className={classes}>{children}</Tag>;
}
