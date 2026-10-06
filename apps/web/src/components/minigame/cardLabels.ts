import type { FractionsFactoryCard } from '../../lib/fractionsFactory';

// Vocabulário fixo dos 5 cartões (RQ4 - paleta pequena e nunca ampliada).
// Ícone + texto sempre juntos (MJ5) - nunca um cartão só com ícone.
export const CARD_ICON: Record<FractionsFactoryCard['type'], string> = {
  choose_whole: '🧺',
  cut_equal_parts: '✂️',
  repeat_cut: '🔁',
  separate_pieces: '🎁',
  deliver_order: '📦',
};

export const CARD_LABEL: Record<FractionsFactoryCard['type'], string> = {
  choose_whole: 'Escolher o inteiro',
  cut_equal_parts: 'Cortar em partes iguais',
  repeat_cut: 'Repetir corte',
  separate_pieces: 'Separar pedaço(s)',
  deliver_order: 'Entregar pedido',
};

export function cardDisplayLabel(card: FractionsFactoryCard): string {
  if (card.type === 'cut_equal_parts') {
    return `${CARD_LABEL.cut_equal_parts} (${card.parts})`;
  }
  if (card.type === 'separate_pieces') {
    return `${CARD_LABEL.separate_pieces} (${card.count})`;
  }
  return CARD_LABEL[card.type];
}
