import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logEvent } from '../../../lib/logEvent';
import { useAuthStore } from '../../../stores/useAuthStore';
import { RiverCrossingPage } from './RiverCrossingPage';

vi.mock('../../../lib/logEvent', () => ({ logEvent: vi.fn() }));

const mockedLog = vi.mocked(logEvent);
const FAST = { crossingMs: 20, conflictMs: 40 };

type User = ReturnType<typeof userEvent.setup>;

const studentUser = {
  id: 'student-1',
  pseudonymId: 'pseudo-1',
  role: 'student' as const,
  displayName: 'Aluno Um',
  avatar: null,
  soundEnabled: false,
  animationEnabled: false,
  sensoryOnboardingCompletedAt: '2026-01-01',
};

beforeEach(() => {
  mockedLog.mockClear();
  useAuthStore.setState({ token: 'token', user: studentUser });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <RiverCrossingPage timing={FAST} />
    </MemoryRouter>,
  );
}

const types = () => mockedLog.mock.calls.map(([event]) => event.type);
const events = (type: string) => mockedLog.mock.calls.map(([event]) => event).filter((e) => e.type === type);
const start = (user: User, round: 1 | 2 = 2) =>
  user.click(screen.getByRole('button', { name: `Começar rodada ${round}` }));
const piece = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}, peso`) });
const enabledCross = () =>
  screen.getAllByRole('button', { name: /Atravessar para/ }).find((button) => !(button as HTMLButtonElement).disabled);
const cross = (user: User) => user.click(enabledCross() as HTMLElement);

describe('Travessia do Rio - eventos', () => {
  it('registra a abertura das regras antes do jogo e o início da rodada', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(events('river_rules_viewed')[0]).toMatchObject({
      category: 'RD-I',
      studentPseudoId: 'pseudo-1',
      payload: { game: 'river_crossing', origin: 'before_start' },
    });
    await start(user, 1);
    expect(events('river_round_started')[0]).toMatchObject({
      category: 'RD-P',
      payload: { round: 1, reason: 'first_start', round_attempt: 1 },
    });
  });

  it('registra carga, peso excedido e a travessia com conflito e regras violadas', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    await user.click(piece('Lobo'));
    await user.click(piece('Alface'));
    expect(events('river_cargo_changed')[0].payload).toMatchObject({ action: 'load', piece: 'wolf' });
    expect(events('river_cargo_rejected_overweight')[0].payload).toMatchObject({ piece: 'lettuce', cargo: ['wolf'] });

    await user.click(screen.getByRole('button', { name: /Tirar Lobo do barco/ }));
    expect(events('river_cargo_changed')[1].payload).toMatchObject({ action: 'unload', cargo_after: [] });

    await user.click(piece('Ovelha'));
    await cross(user);
    const attempt = events('river_crossing_attempted')[0];
    expect(attempt).toMatchObject({ category: 'RD-P' });
    expect(attempt.payload).toMatchObject({
      round: 2,
      from_bank: 'E',
      to_bank: 'D',
      cargo: ['sheep'],
      outcome: 'conflict',
      rules_violated: ['R3', 'R4'],
      fuel_after: 12,
      crossing_number: 1,
      invalid_attempts_so_far: 1,
    });
  });

  it('registra o pedido de dica uma vez só, com número e desconto', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    await user.click(screen.getByRole('button', { name: 'Virar dica 3' }));
    expect(screen.getByRole('article', { name: 'Dica 3' })).toHaveTextContent(/Então a Galinha vai/);
    expect(screen.queryByRole('button', { name: 'Virar dica 3' })).not.toBeInTheDocument();

    const hints = events('river_hint_requested');
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({ category: 'RD-I' });
    expect(hints[0].payload).toMatchObject({
      round: 2,
      hint_number: 3,
      discount_points: 0.5,
      hints_used_after: 1,
      out_of_order: true,
    });

    await user.click(screen.getByRole('button', { name: 'Virar dica 1' }));
    expect(events('river_hint_requested')[1].payload).toMatchObject({ hint_number: 1, hints_used_after: 2, out_of_order: false });
  });

  it('mostra 3 cartas na rodada 1 e 5 na rodada 2', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user, 1);
    expect(screen.getAllByRole('button', { name: /^Virar dica/ })).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Recomeçar' }));
    await user.click(screen.getByRole('button', { name: 'Ver regras' }));
    await user.click(screen.getByRole('button', { name: 'Recomeçar na rodada 2' }));
    expect(screen.getAllByRole('button', { name: /^Virar dica/ })).toHaveLength(5);
  });

  it('registra ver regras, voltar das regras e recomeçar', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    await user.click(screen.getByRole('button', { name: 'Ver regras' }));
    expect(events('river_rules_viewed')[1].payload).toMatchObject({ origin: 'during_round', round: 2 });
    await user.click(screen.getByRole('button', { name: 'Continuar a travessia' }));
    expect(events('river_rules_resumed')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Recomeçar' }));
    expect(events('river_restarted')[0].payload).toMatchObject({ round: 2, reason: 'manual_restart', fuel_left: 13 });
    expect(events('river_round_started')[1].payload).toMatchObject({ reason: 'manual_restart', round_attempt: 2 });
  });

  it('registra o som ligado/desligado', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    await user.click(screen.getByRole('switch'));
    expect(events('river_sound_toggled')[0].payload).toMatchObject({ enabled: false });
  });

  it('registra fim de combustível e o recomeço depois dele', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user, 1);
    for (let left = 6; left >= 0; left -= 1) {
      await cross(user);
      if (left > 0) await waitFor(() => expect(enabledCross()).toBeTruthy());
    }
    await screen.findByText('O combustível acabou');
    expect(events('river_fuel_depleted')[0].payload).toMatchObject({ round: 1, crossings: 7, invalid_attempts: 7 });
    expect(events('river_crossing_attempted')).toHaveLength(7);

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(events('river_restarted')[0].payload).toMatchObject({ reason: 'after_out_of_fuel' });
  });

  it('registra a conclusão da rodada 1 com travessias, dicas usadas e gotas', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user, 1);
    await user.click(screen.getByRole('button', { name: 'Virar dica 1' }));
    const solution = [['Alface', 'Cachorro'], [], ['Ovelha'], ['Alface'], ['Alface', 'Galinha']];
    for (const cargo of solution) {
      for (const name of cargo) await user.click(piece(name));
      await cross(user);
      await new Promise((resolve) => setTimeout(resolve, FAST.crossingMs + 20));
    }
    await screen.findByText('Todos chegaram à margem direita');
    expect(events('river_round_completed')[0]).toMatchObject({ category: 'RD-C' });
    expect(events('river_round_completed')[0].payload).toMatchObject({
      round: 1,
      crossings: 5,
      invalid_attempts: 0,
      fuel_left: 2,
      hints_used: 1,
    });
  });

  it('registra abandono (RD-E) só com números brutos quando sai no meio da rodada', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await start(user);
    unmount();
    const abandoned = events('river_abandoned');
    expect(abandoned).toHaveLength(1);
    expect(abandoned[0]).toMatchObject({ category: 'RD-E' });
    expect(Object.keys(abandoned[0].payload ?? {}).sort()).toEqual(
      ['crossings', 'fuel_left', 'game', 'hints_used', 'round', 'time_in_round_ms', 'timestamp'].sort(),
    );
  });

  it('não registra abandono se a rodada já terminou nem se nunca começou', () => {
    const { unmount } = renderPage();
    unmount();
    expect(types()).not.toContain('river_abandoned');
  });
});

describe('Travessia do Rio - controles de travessia', () => {
  it('bloqueia o botão do lado em que o barco já está e libera o outro', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    const left = screen.getByRole('button', { name: 'Atravessar para a margem esquerda' });
    const right = screen.getByRole('button', { name: 'Atravessar para a margem direita' });
    expect(left).toBeDisabled();
    expect(right).toBeEnabled();

    await user.click(piece('Alface'));
    await user.click(piece('Galinha'));
    await user.click(right);
    await waitFor(() => expect(left).toBeEnabled());
    expect(right).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Recomeçar' })).toBeInTheDocument();
  });

  it('mostra a explicação do botão no hover', async () => {
    const user = userEvent.setup();
    renderPage();
    await start(user);
    await user.hover(screen.getByRole('button', { name: 'Recomeçar' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/Volta a rodada ao começo/);
  });
});
