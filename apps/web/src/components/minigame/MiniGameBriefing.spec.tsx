import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MiniGameBriefing } from './MiniGameBriefing';

describe('MiniGameBriefing', () => {
  it('renders icon and text for every step (MJ5 - never icon-only)', () => {
    render(
      <MiniGameBriefing
        title="Fábrica de Pedaços Iguais"
        objective="Separe a fração pedida."
        steps={[
          { icon: '✂️', label: 'Corte em partes iguais' },
          { icon: '🎁', label: 'Entregue o pedido' },
        ]}
        onStart={() => {}}
      />,
    );

    expect(screen.getByText('Corte em partes iguais')).toBeInTheDocument();
    expect(screen.getByText('Entregue o pedido')).toBeInTheDocument();
    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(screen.getByText('Fim')).toBeInTheDocument();
  });

  it('calls onStart when the confirm button is pressed', async () => {
    const onStart = vi.fn();
    render(
      <MiniGameBriefing title="Título" objective="Objetivo" steps={[]} onStart={onStart} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Começar' }));

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('shows "Continuar" instead of "Começar" when reopened mid-round', () => {
    render(
      <MiniGameBriefing
        title="Título"
        objective="Objetivo"
        steps={[]}
        onStart={() => {}}
        reopened
      />,
    );

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });
});
