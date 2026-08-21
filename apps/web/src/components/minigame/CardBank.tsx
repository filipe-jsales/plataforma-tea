import { SelectableCard } from '../ui';
import { CARD_ICON, CARD_LABEL } from './cardLabels';
import type { FractionsFactoryCard } from '../../lib/fractionsFactory';
import './CardBank.css';

const CARD_TYPES: FractionsFactoryCard['type'][] = [
  'choose_whole',
  'cut_equal_parts',
  'repeat_cut',
  'separate_pieces',
  'deliver_order',
];

const DEFAULT_CARD: Record<FractionsFactoryCard['type'], () => FractionsFactoryCard> = {
  choose_whole: () => ({ type: 'choose_whole' }),
  cut_equal_parts: () => ({ type: 'cut_equal_parts', parts: 2 }),
  repeat_cut: () => ({ type: 'repeat_cut' }),
  separate_pieces: () => ({ type: 'separate_pieces', count: 1 }),
  deliver_order: () => ({ type: 'deliver_order' }),
};

export interface CardBankProps {
  onAdd: (card: FractionsFactoryCard) => void;
}

// MJ4/nível Create — paleta pequena e FIXA (RQ4, sobrecarga cognitiva:
// 39,13% dos estudos), nunca mais que os 5 cartões já ensinados nos níveis
// Use/Modify. Clique adiciona ao fim da sequência (o aluno reordena depois
// com os botões ↑/↓ de CardSequenceEditor) — nunca drag-and-drop.
export function CardBank({ onAdd }: CardBankProps) {
  return (
    <div className="card-bank" role="group" aria-label="Cartões disponíveis">
      {CARD_TYPES.map((type) => (
        <SelectableCard key={type} icon={CARD_ICON[type]} onSelect={() => onAdd(DEFAULT_CARD[type]())}>
          {CARD_LABEL[type]}
        </SelectableCard>
      ))}
    </div>
  );
}
