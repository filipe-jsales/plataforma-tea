import { Button, Select } from '../ui';
import { CARD_ICON, CARD_LABEL, cardDisplayLabel } from './cardLabels';
import type { FractionsFactoryCard } from '../../lib/fractionsFactory';
import './CardSequenceEditor.css';

const PARTS_OPTIONS = Array.from({ length: 7 }, (_, i) => i + 2).map((n) => ({
  value: String(n),
  label: String(n),
}));
const COUNT_OPTIONS = Array.from({ length: 7 }, (_, i) => i + 1).map((n) => ({
  value: String(n),
  label: String(n),
}));

export interface CardSequenceEditorProps {
  cards: FractionsFactoryCard[];
  onChange: (cards: FractionsFactoryCard[]) => void;
  // Nível Use (3.7): sequência já pronta e correta, só observação — nenhum
  // controle de edição/reordenação aparece.
  readOnly?: boolean;
}

// MJ4 — reordenar por botão (↑/↓), nunca drag-and-drop de precisão fina
// (RQ4, coordenação motora fina — 21,74% dos estudos). Slots fixos, área de
// toque mínima já garantida por `Button` (56×56, ver components/ui).
export function CardSequenceEditor({ cards, onChange, readOnly }: CardSequenceEditorProps) {
  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...cards];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index: number) {
    if (index === cards.length - 1) return;
    const next = [...cards];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function remove(index: number) {
    onChange(cards.filter((_, i) => i !== index));
  }

  function updateParts(index: number, value: string) {
    const next = [...cards];
    const card = next[index];
    if (card.type === 'cut_equal_parts') {
      next[index] = { ...card, parts: Number(value) };
      onChange(next);
    }
  }

  function updateCount(index: number, value: string) {
    const next = [...cards];
    const card = next[index];
    if (card.type === 'separate_pieces') {
      next[index] = { ...card, count: Number(value) };
      onChange(next);
    }
  }

  if (cards.length === 0) {
    return <p className="card-sequence-editor__empty">Nenhum cartão na sequência ainda.</p>;
  }

  return (
    <ol className="card-sequence-editor" aria-label="Sequência de cartões">
      {cards.map((card, index) => (
        <li key={index} className="card-sequence-editor__item">
          <span className="card-sequence-editor__icon" aria-hidden="true">
            {CARD_ICON[card.type]}
          </span>
          <span className="card-sequence-editor__label">{readOnly ? cardDisplayLabel(card) : CARD_LABEL[card.type]}</span>

          {!readOnly && card.type === 'cut_equal_parts' && (
            <Select
              id={`card-${index}-parts`}
              label="Quantas partes"
              value={String(card.parts)}
              options={PARTS_OPTIONS}
              onValueChange={(value) => updateParts(index, value)}
            />
          )}
          {!readOnly && card.type === 'separate_pieces' && (
            <Select
              id={`card-${index}-count`}
              label="Quantos pedaços"
              value={String(card.count)}
              options={COUNT_OPTIONS}
              onValueChange={(value) => updateCount(index, value)}
            />
          )}

          {!readOnly && (
            <span className="card-sequence-editor__controls">
              <Button
                variant="ghost"
                icon="↑"
                aria-label={`Mover "${CARD_LABEL[card.type]}" para cima`}
                onClick={() => moveUp(index)}
                disabled={index === 0}
              >
                Subir
              </Button>
              <Button
                variant="ghost"
                icon="↓"
                aria-label={`Mover "${CARD_LABEL[card.type]}" para baixo`}
                onClick={() => moveDown(index)}
                disabled={index === cards.length - 1}
              >
                Descer
              </Button>
              <Button
                variant="ghost"
                icon="🗑️"
                aria-label={`Remover "${CARD_LABEL[card.type]}"`}
                onClick={() => remove(index)}
              >
                Remover
              </Button>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
