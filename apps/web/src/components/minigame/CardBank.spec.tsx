import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CardBank } from './CardBank';

describe('CardBank', () => {
  it('renders the 5 fixed card types, icon + text (MJ5 - never icon-only), never more (RQ4 paleta pequena)', () => {
    render(<CardBank onAdd={vi.fn()} />);

    const labels = [
      'Escolher o inteiro',
      'Cortar em partes iguais',
      'Repetir corte',
      'Separar pedaço(s)',
      'Entregar pedido',
    ];
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('MJ4 - adds the default card via mouse click', async () => {
    const onAdd = vi.fn();
    render(<CardBank onAdd={onAdd} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cortar em partes iguais' }));

    expect(onAdd).toHaveBeenCalledWith({ type: 'cut_equal_parts', parts: 2 });
  });

  it('MJ4 - adds a card via keyboard alone (Tab + Enter), same outcome as a mouse click', async () => {
    const onAdd = vi.fn();
    render(<CardBank onAdd={onAdd} />);
    const user = userEvent.setup();

    screen.getByRole('button', { name: 'Escolher o inteiro' }).focus();
    await user.keyboard('{Enter}');

    expect(onAdd).toHaveBeenCalledWith({ type: 'choose_whole' });
  });
});
