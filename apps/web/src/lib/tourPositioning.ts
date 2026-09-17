export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CardPlacement {
  top: number;
  left: number;
  // Só pra quem quiser desenhar uma "setinha" apontando pro alvo depois —
  // o cálculo de posição em si não depende disso.
  placement: 'top' | 'bottom';
}

const GAP = 12;
const VIEWPORT_MARGIN = 16;

// Função pura (sem DOM) — GuidedTour.tsx mede `target`/`card` de verdade via
// `getBoundingClientRect` e só chama isto pro cálculo. Separado do
// componente de propósito: jsdom sempre devolve retângulo zerado (ver nota
// em GuidedTour.spec.tsx), então é só aqui, com retângulos inventados, que a
// lógica de "onde encaixa o card" tem cobertura de teste de verdade.
//
// Regra: preferir embaixo do alvo; só vai pra cima se não couber embaixo E
// houver mais espaço em cima (nunca escolher "cima" só porque cabe, se
// embaixo também cabe — resultado mais prático de prever/testar). Depois,
// centraliza horizontalmente sobre o alvo, mas nunca deixa o card vazar a
// viewport — recorta pro `VIEWPORT_MARGIN` de qualquer lado.
export function computeCardPlacement(target: Rect, viewport: Size, card: Size): CardPlacement {
  const spaceBelow = viewport.height - (target.top + target.height);
  const spaceAbove = target.top;
  const fitsBelow = spaceBelow >= card.height + GAP;
  const placement: CardPlacement['placement'] = fitsBelow || spaceBelow >= spaceAbove ? 'bottom' : 'top';

  const rawTop = placement === 'bottom' ? target.top + target.height + GAP : target.top - card.height - GAP;
  const maxTop = viewport.height - card.height - VIEWPORT_MARGIN;
  const top = Math.min(Math.max(rawTop, VIEWPORT_MARGIN), Math.max(maxTop, VIEWPORT_MARGIN));

  const rawLeft = target.left + target.width / 2 - card.width / 2;
  const maxLeft = viewport.width - card.width - VIEWPORT_MARGIN;
  const left = Math.min(Math.max(rawLeft, VIEWPORT_MARGIN), Math.max(maxLeft, VIEWPORT_MARGIN));

  return { top, left, placement };
}
