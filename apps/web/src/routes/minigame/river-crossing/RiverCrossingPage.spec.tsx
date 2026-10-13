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

type User = ReturnType<typeof userEvent.setup>;

const fuel = (left: number) => screen.findByRole('img', { name: `Combustível: ${left} de 13 gotas` });
const start = (user: User) => user.click(screen.getByRole('button', { name: 'Começar' }));
const piece = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}, peso`) });
const cross = (user: User) => user.click(screen.getByRole('button', { name: /Atravessar para/ }));
const onBank = (side: 'E' | 'D', name: string) =>
  screen.getByRole('region', { name: `Margem ${side}` }).querySelector(`[aria-label^="${name}, peso"]`);

describe('RiverCrossingPage', () => {
  it('mostra as regras antes do jogo, sem tabuleiro', () => {
    renderPage();
    expect(screen.getByRole('region', { name: 'Regras do jogo' })).toBeInTheDocument();
    expect(screen.getByText(/O Lobo devora a Ovelha, exceto se o Cachorro/)).toBeInTheDocument();
    expect(screen.queryByTestId('river')).not.toBeInTheDocument();
    expect(screen.queryByText(/aquecimento|rodada/i)).not.toBeInTheDocument();
  });

  it('mostra só os desenhos dos personagens, com o peso em badge e sem nome visível', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    expect(screen.getByRole('button', { name: 'Lobo, peso 2' })).toHaveTextContent(/^2$/);
    expect(piece('Ovelha')).toHaveTextContent(/^2$/);
    expect(piece('Alface')).toHaveTextContent(/^1$/);
    expect(screen.getByRole('region', { name: 'Margem E' })).not.toHaveTextContent(/Ovelha|Lobo|peso|\(/);
  });

  it('Ver regras não reinicia a travessia em andamento', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    await user.click(piece('Alface'));
    await user.click(piece('Galinha'));
    await cross(user);
    await waitFor(() => expect(onBank('D', 'Alface')).not.toBeNull());
    await fuel(12);

    await user.click(screen.getByRole('button', { name: 'Ver regras' }));
    expect(screen.queryByRole('button', { name: 'Começar' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar a travessia' }));

    expect(await fuel(12)).toBeInTheDocument();
    expect(screen.getByTestId('boat')).toHaveAttribute('data-side', 'D');
    expect(onBank('D', 'Alface')).not.toBeNull();
    expect(onBank('D', 'Galinha')).not.toBeNull();
  });

  it('não deixa passar do peso do barco', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    await user.click(piece('Lobo'));
    await user.click(piece('Alface'));
    expect(screen.getByText(/O barco leva o Fazendeiro e carga de até peso 2/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tirar Alface do barco/ })).not.toBeInTheDocument();
  });

  it('travessia com conflito anima, é desfeita e gasta uma gota', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    await user.click(piece('Ovelha'));
    await cross(user);

    expect(screen.getByTestId('boat')).toHaveAttribute('data-side', 'D');
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Margem E' })).toHaveAttribute('data-conflict', 'true'),
    );
    expect(screen.getByText(/Conflito na margem E/)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Margem E' })).not.toHaveAttribute('data-conflict'),
    );
    expect(screen.getByTestId('boat')).toHaveAttribute('data-side', 'E');
    expect(await fuel(12)).toBeInTheDocument();
    expect(onBank('E', 'Ovelha')).not.toBeNull();
  });

  it('travessia válida desembarca a carga na outra margem', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    await user.click(piece('Alface'));
    await user.click(piece('Galinha'));
    await cross(user);

    await waitFor(() => {
      expect(onBank('D', 'Galinha')).not.toBeNull();
      expect(onBank('D', 'Alface')).not.toBeNull();
    });
    expect(await fuel(12)).toBeInTheDocument();
  });

  it('fim de jogo por combustível usa linguagem não punitiva e permite tentar de novo', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    for (let left = 12; left >= 0; left -= 1) {
      await cross(user);
      if (left > 0) {
        await fuel(left);
        await waitFor(() => expect(screen.getByRole('button', { name: /Atravessar para/ })).toBeEnabled());
      }
    }
    expect(await screen.findByText('O combustível acabou')).toBeInTheDocument();
    expect(screen.queryByText(/perdeu|errado|falhou/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await fuel(13)).toBeInTheDocument();
  });

  it('vence o jogo pela solução de 11 travessias', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);

    const solution = [
      ['Alface', 'Galinha'],
      ['Alface'],
      ['Ovelha'],
      [],
      ['Lobo'],
      ['Ovelha'],
      ['Alface', 'Cachorro'],
      ['Galinha'],
      ['Ovelha'],
      ['Alface'],
      ['Alface', 'Galinha'],
    ];
    for (const cargo of solution) {
      for (const name of cargo) await user.click(piece(name));
      await cross(user);
      await new Promise((resolve) => setTimeout(resolve, FAST.crossingMs + 20));
    }

    expect(await screen.findByText('Todos chegaram à margem D')).toBeInTheDocument();
  });
});
