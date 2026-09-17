import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { computeCardPlacement, type Rect } from '../../lib/tourPositioning';
import { Button } from './Button';
import './GuidedTour.css';

export interface GuidedTourStep {
  // Id de QUALQUER elemento já na tela — o tour nunca renderiza o alvo, só
  // aponta pra ele (`document.getElementById`). Quem monta os passos decide
  // o que marcar de id (ver TeacherChallengeNew.tsx).
  targetId: string;
  title: string;
  description: string;
}

export interface GuidedTourProps {
  steps: GuidedTourStep[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Tutorial guiado genérico, "spotlight" num elemento por vez — mesma ideia
// de onboarding de app recém-instalado: cada passo foca um elemento
// (`targetId`) com uma caixinha explicando, "Próximo" avança pro próximo
// alvo, até o último passo. O componente é 100% dirigido por dado
// (`steps`) — nunca sabe o que é "criar um desafio"/nome de campo
// específico, então serve qualquer tutorial futuro só passando uma lista
// de passos diferente (mesmo raciocínio de TemplateParameterField
// renderizar só a partir de `definition.type`, nunca por nome de campo).
//
// Construído sobre `@radix-ui/react-dialog` (mesmo primitivo de Dialog.tsx,
// ver "Decisão técnica: Radix UI" em frontend.md) — não pelo layout (a
// posição do card é calculada, não centralizada), mas pelo que a lib já
// resolve de graça e não vale reimplementar na mão: focus trap dentro do
// card, `Escape`/clique-fora fecham, `aria-modal`. O que É custom aqui:
// `Content` nasce posicionado perto do `targetId` (`computeCardPlacement`,
// lib/tourPositioning.ts — função pura, testada isoladamente porque jsdom
// não calcula layout de verdade) e um anel visual
// (`.ui-guided-tour__spotlight`) marca o elemento em foco.
export function GuidedTour({ steps, open, onOpenChange }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const step = steps[stepIndex];

  // Sempre reabre no PRIMEIRO passo — nunca no meio de onde o professor
  // parou da última vez (ex.: reabrindo pelo link "Rever tutorial" depois
  // de já ter concluído uma vez).
  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  // Mede o alvo de novo a cada passo (o elemento muda) e em resize/scroll
  // (a posição na viewport muda mesmo com o mesmo elemento) — nunca uma
  // medição única presa ao valor do primeiro render.
  useLayoutEffect(() => {
    if (!open || !step) return;

    function measure() {
      const target = document.getElementById(step.targetId);
      if (!target) {
        setTargetRect(null);
        return;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = target.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step]);

  useLayoutEffect(() => {
    if (!targetRect || !cardRef.current) return;
    const cardRect = cardRef.current.getBoundingClientRect();
    setCardPosition(
      computeCardPlacement(
        targetRect,
        { width: window.innerWidth, height: window.innerHeight },
        { width: cardRect.width, height: cardRect.height },
      ),
    );
  }, [targetRect]);

  if (!step) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-guided-tour__overlay" />
        {targetRect && (
          <div
            aria-hidden="true"
            className="ui-guided-tour__spotlight"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        )}
        <DialogPrimitive.Content
          ref={cardRef}
          className="ui-guided-tour__card"
          style={{ top: cardPosition.top, left: cardPosition.left }}
          onOpenAutoFocus={(event: Event) => {
            // Sem isto, Radix foca o primeiro elemento focável do card
            // (seria "Pular tutorial") — não é a ação que o professor vai
            // querer repetir a cada passo, "Próximo"/"Concluir" é.
            event.preventDefault();
            nextButtonRef.current?.focus();
          }}
        >
          <p className="ui-guided-tour__step-count">
            Passo {stepIndex + 1} de {steps.length}
          </p>
          <DialogPrimitive.Title className="ui-guided-tour__title">{step.title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="ui-guided-tour__description">
            {step.description}
          </DialogPrimitive.Description>

          <div className="ui-guided-tour__actions">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Pular tutorial
            </Button>
            <div className="ui-guided-tour__nav">
              {!isFirst && (
                <Button type="button" variant="secondary" onClick={() => setStepIndex((current) => current - 1)}>
                  ← Voltar
                </Button>
              )}
              <Button
                ref={nextButtonRef}
                type="button"
                onClick={() => (isLast ? onOpenChange(false) : setStepIndex((current) => current + 1))}
              >
                {isLast ? 'Concluir' : 'Próximo →'}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
