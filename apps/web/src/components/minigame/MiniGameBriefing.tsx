import type { ReactNode } from 'react';
import { Button, Heading, Text } from '../ui';
import './MiniGameBriefing.css';
import { Flag, Goal } from 'lucide-react';

export interface MiniGameBriefingStep {
  icon: ReactNode;
  label: string;
}

export interface MiniGameBriefingProps {
  title: string;
  objective: string;
  steps: MiniGameBriefingStep[];
  onStart: () => void;
  // Reabrir (ver "Ver roteiro" no header da tela do jogo): rótulo do botão
  // muda pra deixar claro que a rodada continua de onde estava.
  reopened?: boolean;
}

// MJ3 - roteiro visual estruturado (estilo TEACCH), reutilizável por
// QUALQUER mini jogo (regra não-negociável 2: previsibilidade antes de
// começar). Objetivo em linguagem simples + número de etapas + início/fim
// marcados visualmente + ícone+texto em cada etapa (MJ5) - nunca só um dos
// dois. O aluno pode reabrir isto a qualquer momento (ver
// FractionsGamePage/MiniGamePage) sem perder progresso: este componente é
// só uma camada de overlay, a store/cena continuam montadas por baixo.
export function MiniGameBriefing({ title, objective, steps, onStart, reopened }: MiniGameBriefingProps) {
  return (
    <div className="mini-game-briefing" role="region" aria-label="Roteiro do mini jogo">
      <Heading level={1}>{title}</Heading>
      <Text size="lg">{objective}</Text>

      <ol className="mini-game-briefing__steps">
        <li className="mini-game-briefing__step mini-game-briefing__step--marker">
          <span className="mini-game-briefing__step-icon" aria-hidden="true"><Flag /></span>
          <span>Início</span>
        </li>
        {steps.map((step, index) => (
          <li key={index} className="mini-game-briefing__step">
            <span className="mini-game-briefing__step-icon" aria-hidden="true">{step.icon}</span>
            <span>{step.label}</span>
          </li>
        ))}
        <li className="mini-game-briefing__step mini-game-briefing__step--marker">
          <span className="mini-game-briefing__step-icon" aria-hidden="true"><Goal /></span>
          <span>Fim</span>
        </li>
      </ol>

      <Text tone="muted" size="sm">
        {steps.length} {steps.length === 1 ? 'etapa' : 'etapas'} no total.
      </Text>

      <Button onClick={onStart}>{reopened ? 'Continuar' : 'Começar'}</Button>
    </div>
  );
}
