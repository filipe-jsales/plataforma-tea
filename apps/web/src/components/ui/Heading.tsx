import type { ReactNode } from 'react';
import './Typography.css';

export type HeadingLevel = 1 | 2 | 3;

export interface HeadingProps {
  level: HeadingLevel;
  children: ReactNode;
  className?: string;
}

// 3.10 — hierarquia tipográfica fixa por nível semântico (h1/h2/h3), nunca
// um `size` solto desacoplado da tag — impede um <h2> visualmente do
// tamanho de <h1> só porque "ficou mais bonito nesta tela" (AC "hierarquia
// tipográfica clara... nunca só cor pra indicar importância"). Sem prop de
// itálico/uppercase de propósito (AC "nenhum texto usa só maiúsculas ou
// itálico como único indicador de ênfase") — se precisar de ênfase, use
// ícone + texto (ver InlineFeedback), não estilo tipográfico sozinho.
export function Heading({ level, children, className }: HeadingProps) {
  const classes = ['ui-heading', `ui-heading--${level}`, className].filter(Boolean).join(' ');
  switch (level) {
    case 1:
      return <h1 className={classes}>{children}</h1>;
    case 2:
      return <h2 className={classes}>{children}</h2>;
    default:
      return <h3 className={classes}>{children}</h3>;
  }
}
