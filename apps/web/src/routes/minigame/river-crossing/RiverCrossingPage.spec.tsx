import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RiverCrossingPage } from './RiverCrossingPage';

const FAST = { crossingMs: 30, conflictMs: 60 };

function renderPage() {
  return render(
    <MemoryRouter>
      <RiverCrossingPage timing={FAST} />
    </MemoryRouter>,
  );
}

const fuel = (left: number, total: number) =>
  screen.findByRole('img', { name: `Combustível: ${left} de ${total} gotas` });

describe('RiverCrossingPage', () => {
  it('mostra as regras antes do jogo, sem tabuleiro', () => {
    renderPage();
    expect(screen.getByRole('region', { name: 'Regras do jogo' })).toBeInTheDocument();
    expect(screen.getByText(/O Lobo devora a Ovelha, exceto se o Cachorro/)).toBeInTheDocument();
    expect(screen.queryByTestId('river')).not.toBeInTheDocument();
  });

  it('começa a rodada 1 sem o Lobo e com 7 gotas', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Começar rodada 1/ }));
    expect(screen.queryByText(/Lobo/)).not.toBeInTheDocument();
    expect(await fuel(7, 7)).toBeInTheDocument();
  });

  it('não deixa passar do peso do barco', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Começar rodada 2/ }));
    await user.click(screen.getByRole('button', { name: /Lobo/ }));
    await user.click(screen.getByRole('button', { name: /Alface/ }));
    expect(screen.getByText(/O barco leva o Fazendeiro e carga de até peso 2/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tirar Alface do barco' })).not.toBeInTheDocument();
  });

  it('travessia com conflito anima, é desfeita e gasta uma gota', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Começar rodada 2/ }));
    await user.click(screen.getByRole('button', { name: /Ovelha/ }));
    await user.click(screen.getByRole('button', { name: /Atravessar/ }));

    expect(screen.getByTestId('boat')).toHaveAttribute('data-side', 'D');
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Margem E' })).toHaveAttribute('data-conflict', 'true'),
    );
    expect(screen.getByText(/Conflito na margem E/)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Margem E' })).not.toHaveAttribute('data-conflict'),
    );
    expect(screen.getByTestId('boat')).toHaveAttribute('data-side', 'E');
    expect(await fuel(12, 13)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Margem E' })).toHaveTextContent('Ovelha');
  });

  it('travessia válida desembarca a carga na outra margem', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Começar rodada 2/ }));
    await user.click(screen.getByRole('button', { name: /Alface/ }));
    await user.click(screen.getByRole('button', { name: /Galinha/ }));
    await user.click(screen.getByRole('button', { name: /Atravessar/ }));

    await waitFor(() => expect(screen.getByRole('region', { name: 'Margem D' })).toHaveTextContent('Galinha'));
    expect(screen.getByRole('region', { name: 'Margem D' })).toHaveTextContent('Alface');
    expect(await fuel(12, 13)).toBeInTheDocument();
  });

  it('fim de jogo por combustível usa linguagem não punitiva e permite tentar de novo', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Começar rodada 1/ }));
    for (let left = 6; left >= 0; left -= 1) {
      await user.click(screen.getByRole('button', { name: /Atravessar/ }));
      if (left > 0) await fuel(left, 7);
      await waitFor(() => expect(screen.queryByText(/Conflito na margem/)).not.toBeInTheDocument());
      if (left > 0) await waitFor(() => expect(screen.getByRole('button', { name: /Atravessar/ })).toBeEnabled());
    }
    expect(await screen.findByText('O combustível acabou')).toBeInTheDocument();
    expect(screen.queryByText(/perdeu|errado|falhou/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await fuel(7, 7)).toBeInTheDocument();
  });

  it('vence a rodada 1 pela solução de 5 travessias', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Começar rodada 1/ }));

    const pick = async (...names: RegExp[]) => {
      for (const name of names) await user.click(screen.getByRole('button', { name }));
      await user.click(screen.getByRole('button', { name: /Atravessar/ }));
      await new Promise((resolve) => setTimeout(resolve, FAST.crossingMs + FAST.conflictMs + 40));
    };

    await pick(/Alface/, /Cachorro/);
    await pick();
    await pick(/Ovelha/);
    await pick(/Alface/);
    await pick(/Alface/, /Galinha/);

    expect(await screen.findByText('Todos chegaram à margem D')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para a rodada 2' })).toBeInTheDocument();
  });
});
