import { useEffect, useRef, useState } from 'react';
import type { WaterState } from '../../lib/waterProgram';
import { useSensoryProfileStore } from '../../stores/useSensoryProfileStore';
import './WaterStateTransition.css';

export interface WaterStateTransitionProps {
  state: WaterState;
}

const STATE_ICON: Record<WaterState, string> = {
  SOLID: '❄️',
  LIQUID: '💧',
  GAS: '☁️',
};

const STATE_LABEL: Record<WaterState, string> = {
  SOLID: 'Sólido',
  LIQUID: 'Líquido',
  GAS: 'Gasoso',
};

// Bipe curto sintetizado via Web Audio (sem asset binário novo) — só
// chamado quando o aluno ligou som explicitamente (desligado por padrão,
// regra não-negociável 1). `webkitAudioContext` cobre Safari mais antigo,
// mesmo racional de qualquer feature-detect de API de browser neste projeto.
function playTransitionChime(): void {
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 440;
  gain.gain.setValueAtTime(0.15, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.25);
}

// 3.16 — transição de estado sólido/líquido/gasoso, reaproveitada pelos 3
// desafios da trilha "Estados da Matéria" (2.1/2.2/2.3). CSS puro (sem
// Pixi/Phaser — esta trilha não carrega motor de jogo, ver
// WaterStateChallengePage): a transição é só uma classe/atributo CSS, e
// sensory-theme.css já zera `transition-duration` fora de
// `data-motion='full'` (mesmo mecanismo de ToggleSwitch.css) — o componente
// nunca reimplementa esse gate, só declara a transição normalmente. Ícone+
// texto sempre juntos (regra não-negociável 9), nunca só a troca visual.
export function WaterStateTransition({ state }: WaterStateTransitionProps) {
  const soundEnabled = useSensoryProfileStore((s) => s.soundEnabled);
  const [entered, setEntered] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    setEntered(false);
    const frame = requestAnimationFrame(() => setEntered(true));
    // Nunca toca som na primeira renderização (estado inicial do desafio,
    // não uma "transição") — só em mudanças reais de `state` depois disso.
    if (soundEnabled && !isFirstRender.current) {
      playTransitionChime();
    }
    isFirstRender.current = false;
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="water-state-transition">
      <span
        key={state}
        className="water-state-transition__icon"
        data-entered={entered}
        aria-hidden="true"
      >
        {STATE_ICON[state]}
      </span>
      <span className="water-state-transition__label" aria-live="polite">
        {STATE_LABEL[state]}
      </span>
    </div>
  );
}
