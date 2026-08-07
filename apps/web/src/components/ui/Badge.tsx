import type { ReactNode } from 'react';
import './Badge.css';

export type BadgeVariant = 'success' | 'warning' | 'neutral' | 'info';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

// 3.11 — badge "Concluído"/"Em andamento" padronizado (AC: "não
// background-color inline repetido em cada tela"), reaproveitando as MESMAS
// cores de feedback já definidas (`--color-success`/`--color-warning`) que
// components/ui/InlineFeedback.tsx usa pro aluno — "concluído = verde"
// significa a mesma coisa nos 3 módulos, feedback positivo pode ser
// expressivo (regra não-punitiva aplicada ao lado positivo).
export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${variant}`}>{children}</span>;
}
