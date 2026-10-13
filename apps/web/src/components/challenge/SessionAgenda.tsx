import { Check, Circle, CircleDot } from 'lucide-react';
import { buildAgendaSteps, type AgendaStepStatus, type ChallengeAgenda } from '../../lib/sessionAgenda';
import './SessionAgenda.css';

const STATUS_TEXT: Record<AgendaStepStatus, string> = {
  done: 'feita',
  current: 'agora',
  next: 'depois',
};

const STATUS_ICON: Record<AgendaStepStatus, typeof Check> = {
  done: Check,
  current: CircleDot,
  next: Circle,
};

// F17 - agenda visual (TEACCH, RQ2 39,13%): mostra de relance onde o aluno
// está na sequência do tópico e o que vem depois, para que nenhuma troca de
// tela seja surpresa. Estado SEMPRE em ícone + palavra (nunca só cor, RQ4),
// sem tempo, contagem ou pontuação (regra 5), e estática: não anima nem
// depende do perfil sensorial. Não renderiza nada quando não há sequência
// (desafio de professor fora do currículo) ou há uma etapa só.
export function SessionAgenda({ agenda }: { agenda: ChallengeAgenda | null | undefined }) {
  const steps = buildAgendaSteps(agenda);
  if (steps.length === 0) return null;

  return (
    <nav aria-label="Etapas de hoje" className="session-agenda">
      <ol className="session-agenda__list">
        {steps.map((step, index) => {
          const Icon = STATUS_ICON[step.status];
          return (
            <li
              key={`${step.stage}-${index}`}
              className="session-agenda__step"
              data-status={step.status}
              aria-current={step.status === 'current' ? 'step' : undefined}
            >
              <span className="session-agenda__icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className="session-agenda__label">{step.label}</span>
              {' '}
              <span className="session-agenda__status">({STATUS_TEXT[step.status]})</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
