import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CardSequenceEditor } from './CardSequenceEditor';
import type { FractionsFactoryCard } from '../../lib/fractionsFactory';

const CARDS: FractionsFactoryCard[] = [
  { type: 'choose_whole' },
  { type: 'cut_equal_parts', parts: 2 },
  { type: 'separate_pieces', count: 1 },
  { type: 'deliver_order' },
];

describe('CardSequenceEditor', () => {
  it('shows an empty-state message instead of an empty list when there are no cards', () => {
    render(<CardSequenceEditor cards={[]} onChange={vi.fn()} />);

    expect(screen.getByText('Nenhum cartão na sequência ainda.')).toBeInTheDocument();
  });

  it('renders no reorder/remove controls in readOnly mode (nível Use)', () => {
    render(<CardSequenceEditor cards={CARDS} onChange={vi.fn()} readOnly />);

    expect(screen.queryByRole('button', { name: /Subir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
  });

  it('disables "Subir" on the first card and "Descer" on the last (MJ4 — no out-of-range reorder)', () => {
    render(<CardSequenceEditor cards={CARDS} onChange={vi.fn()} />);
    const upButtons = screen.getAllByRole('button', { name: /para cima/ });
    const downButtons = screen.getAllByRole('button', { name: /para baixo/ });

    expect(upButtons[0]).toBeDisabled();
    expect(downButtons[downButtons.length - 1]).toBeDisabled();
  });

  it('MJ4 — reorders via mouse click on the "Subir"/"Descer" buttons, never drag-and-drop', async () => {
    const onChange = vi.fn();
    render(<CardSequenceEditor cards={CARDS} onChange={onChange} />);

    // Move o 2º cartão ("Cortar em partes iguais") pra cima.
    await userEvent.click(screen.getAllByRole('button', { name: /para cima/ })[1]);

    expect(onChange).toHaveBeenCalledWith([
      { type: 'cut_equal_parts', parts: 2 },
      { type: 'choose_whole' },
      { type: 'separate_pieces', count: 1 },
      { type: 'deliver_order' },
    ]);
  });

  it('MJ4 — reorders via keyboard alone (Tab + Enter), same outcome as a mouse click', async () => {
    const onChange = vi.fn();
    render(<CardSequenceEditor cards={CARDS} onChange={onChange} />);
    const user = userEvent.setup();

    // Tabula até o primeiro botão "Descer" (do cartão "Escolher o inteiro")
    // sem nenhum clique de mouse — prova de navegação alternativa (AC de MJ4).
    const downButtons = screen.getAllByRole('button', { name: /para baixo/ });
    downButtons[0].focus();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith([
      { type: 'cut_equal_parts', parts: 2 },
      { type: 'choose_whole' },
      { type: 'separate_pieces', count: 1 },
      { type: 'deliver_order' },
    ]);
  });

  it('removes a card via the "Remover" button', async () => {
    const onChange = vi.fn();
    render(<CardSequenceEditor cards={CARDS} onChange={onChange} />);

    await userEvent.click(screen.getAllByRole('button', { name: /Remover/ })[0]);

    expect(onChange).toHaveBeenCalledWith([
      { type: 'cut_equal_parts', parts: 2 },
      { type: 'separate_pieces', count: 1 },
      { type: 'deliver_order' },
    ]);
  });

  it('editing the "Cortar em partes iguais" parts field updates only that card', async () => {
    const onChange = vi.fn();
    render(<CardSequenceEditor cards={CARDS} onChange={onChange} />);

    await userEvent.click(screen.getByRole('combobox', { name: /Quantas partes/ }));
    await userEvent.click(await screen.findByRole('option', { name: '4' }));

    expect(onChange).toHaveBeenCalledWith([
      { type: 'choose_whole' },
      { type: 'cut_equal_parts', parts: 4 },
      { type: 'separate_pieces', count: 1 },
      { type: 'deliver_order' },
    ]);
  });
});
