import { useState } from 'react';
import {
  CHALLENGE_CREATION_SURVEY_QUALITATIVE_ITEMS,
  CHALLENGE_CREATION_SURVEY_QUANTITATIVE_ITEMS,
  submitChallengeCreationSurvey,
} from '../../lib/challengeCreationSurvey';
import { Button, InlineFeedback, LikertScaleField, TextareaField } from '../ui';
import './ChallengeCreationSurvey.css';

export interface ChallengeCreationSurveyProps {
  challengeId: string;
  // Chamado depois que a resposta (ou a recusa) já foi persistida — quem
  // usa este componente decide o que acontece depois (hoje, navegar pra
  // "Meus desafios"; ver TeacherChallengeNew.tsx). Nunca bloqueia a
  // navegação se o envio falhar — ver `handleDecline`/`handleSubmit`.
  onDone: () => void;
}

// Survey de pesquisa (opinião do professor sobre a própria experiência de
// autoria), disparado só depois que o desafio JÁ foi criado com sucesso —
// nunca antes, nunca bloqueando a publicação em si. Sempre com saída
// "Agora não" (nunca uma tela sem escape, mesmo racional de "Pular
// tutorial" em GuidedTour.tsx) — um survey que força resposta pra poder
// sair introduz viés de resposta forçada, o oposto do que a metodologia de
// survey research recomenda.
export function ChallengeCreationSurvey({ challengeId, onDone }: ChallengeCreationSurveyProps) {
  const [quantitative, setQuantitative] = useState<Record<string, string>>({});
  const [qualitative, setQualitative] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleQuantitativeChange(itemId: string, value: string) {
    setQuantitative((current) => ({ ...current, [itemId]: value }));
  }

  function handleQualitativeChange(itemId: string, value: string) {
    setQualitative((current) => ({ ...current, [itemId]: value }));
  }

  // 'declined' nunca é bloqueado por erro de rede — se salvar a recusa
  // falhar, a pessoa não deveria ficar presa na tela só por causa de um
  // instrumento de pesquisa opcional. `handleSubmit` (resposta de verdade)
  // já mostra o erro e deixa tentar de novo, porque ali existe conteúdo
  // digitado que vale a pena não perder silenciosamente.
  async function handleDecline() {
    try {
      await submitChallengeCreationSurvey({ challengeId, status: 'declined' });
    } catch {
      // Ignorado de propósito — ver nota acima.
    } finally {
      onDone();
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitChallengeCreationSurvey({
        challengeId,
        status: 'submitted',
        quantitative: Object.fromEntries(
          Object.entries(quantitative).map(([itemId, value]) => [itemId, Number(value)]),
        ),
        qualitative,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar suas respostas. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="challenge-creation-survey" onSubmit={handleSubmit}>
      <h2>🎉 Desafio criado! Uma pergunta rápida antes de continuar</h2>
      <p className="challenge-creation-survey__intro">
        Suas respostas ajudam a melhorar esta ferramenta para outros professores — leva menos de um minuto, e é
        totalmente opcional.
      </p>

      <div className="challenge-creation-survey__quantitative">
        {CHALLENGE_CREATION_SURVEY_QUANTITATIVE_ITEMS.map((item) => (
          <LikertScaleField
            key={item.id}
            id={`challenge-creation-survey-${item.id}`}
            statement={item.statement}
            value={quantitative[item.id] ?? ''}
            onChange={(value) => handleQuantitativeChange(item.id, value)}
          />
        ))}
      </div>

      <div className="challenge-creation-survey__qualitative">
        {CHALLENGE_CREATION_SURVEY_QUALITATIVE_ITEMS.map((item) => (
          <TextareaField
            key={item.id}
            id={`challenge-creation-survey-${item.id}`}
            label={item.label}
            value={qualitative[item.id] ?? ''}
            onChange={(event) => handleQualitativeChange(item.id, event.target.value)}
          />
        ))}
      </div>

      {error && <InlineFeedback kind="retry">{error}</InlineFeedback>}

      <div className="challenge-creation-survey__actions">
        <Button type="button" variant="ghost" onClick={handleDecline} disabled={submitting}>
          Agora não
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar respostas'}
        </Button>
      </div>
    </form>
  );
}
