import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { apiClient } from '../../../lib/apiClient';
import { logEvent } from '../../../lib/logEvent';
import { ANOMALY_DEFINITION } from '../../../lib/scheduler/anomalies';
import type { Op, Scenario } from '../../../lib/scheduler/engine';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useSensoryProfileStore } from '../../../stores/useSensoryProfileStore';
import SchedulerGamePage, { REVEAL_MS } from './SchedulerGamePage';

vi.mock('../../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../../lib/logEvent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/logEvent')>()),
  logEvent: vi.fn(),
}));

// Cenário do slide: X = 80, N = 5, M = 4. Serial = 71; intercalado = 75.
const lostUpdateOps: Op[] = [
  { tx: 'T1', kind: 'read', item: 'X' },
  { tx: 'T2', kind: 'read', item: 'X' },
  { tx: 'T2', kind: 'compute', item: 'X', delta: -4 },
  { tx: 'T1', kind: 'compute', item: 'X', delta: -5 },
  { tx: 'T2', kind: 'write', item: 'X' },
  { tx: 'T1', kind: 'write', item: 'X' },
  { tx: 'T1', kind: 'commit' },
  { tx: 'T2', kind: 'commit' },
];
const slide: Scenario = {
  id: 'slide',
  level: 1,
  initial: { X: 80 },
  ops: lostUpdateOps,
  target: { kind: 'item', item: 'X' },
};

vi.mock('../../../lib/scheduler/scenarios', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/scheduler/scenarios')>()),
  buildSession: vi.fn(() => [slide, slide]),
}));

type User = ReturnType<typeof userEvent.setup>;

function renderGame() {
  return render(
    <MemoryRouter>
      <SchedulerGamePage standalone />
    </MemoryRouter>,
  );
}

const rowCount = () => within(screen.getByRole('table')).getAllByRole('row').length - 1;

async function predict(user: User, prediction: string) {
  await user.click(screen.getByRole('button', { name: 'Começar' }));
  await user.type(screen.getByLabelText(/valor final de X\?/), prediction);
  await user.click(screen.getByRole('button', { name: 'Confirmar previsão' }));
}

async function answer(user: User, value: string, classification: RegExp) {
  await user.click(screen.getByRole('button', { name: 'Mostrar tudo' }));
  await user.type(screen.getByLabelText(/Na execução intercalada/), value);
  await user.click(screen.getByRole('button', { name: classification }));
  await user.click(screen.getByRole('button', { name: 'Confirmar resposta' }));
}

beforeEach(() => {
  vi.mocked(logEvent).mockClear();
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.post).mockResolvedValue(undefined as never);
  useSensoryProfileStore.setState({ motionEnabled: false });
  useAuthStore.setState({ token: null, user: null });
});

describe('Detetive do Escalonador', () => {
  it('mostra as transações e pede a previsão serial antes de revelar qualquer linha', async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole('button', { name: 'Começar' }));

    expect(screen.getByText('Valores iniciais:', { exact: false })).toHaveTextContent('X = 80');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Se as transações executassem uma após a outra/)).toBeInTheDocument();
  });

  it('revela uma operação por vez, sem revelação automática por padrão', async () => {
    const user = userEvent.setup();
    renderGame();
    await predict(user, '71');

    expect(rowCount()).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Próxima operação' }));
    expect(rowCount()).toBe(2);
    expect(screen.queryByRole('region', { name: 'Sua resposta' })).not.toBeInTheDocument();
  });

  it('no modo automático revela uma linha a cada intervalo', () => {
    vi.useFakeTimers();
    try {
      useSensoryProfileStore.setState({ motionEnabled: true });
      renderGame();
      fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
      fireEvent.change(screen.getByLabelText(/valor final de X\?/), { target: { value: '71' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar previsão' }));

      expect(rowCount()).toBe(1);
      act(() => {
        vi.advanceTimersByTime(REVEAL_MS);
      });
      expect(rowCount()).toBe(2);
      // Cada linha agenda a próxima só depois de renderizar, então avança uma por vez.
      for (let i = 0; i < lostUpdateOps.length; i++) {
        act(() => {
          vi.advanceTimersByTime(REVEAL_MS);
        });
      }
      expect(rowCount()).toBe(lostUpdateOps.length);
      expect(screen.getByRole('region', { name: 'Sua resposta' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('acerto: 3 pontos, definição exata e as operações-causa marcadas na tabela', async () => {
    const user = userEvent.setup();
    renderGame();
    await predict(user, '71');
    await answer(user, '75', /Perda de atualização/);

    expect(screen.getByText('Rodada completa: 3 de 3 pontos.')).toBeInTheDocument();
    expect(screen.getAllByText(ANOMALY_DEFINITION.lost_update).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Causa:/)).toHaveLength(4);
  });

  it('erro: linguagem não punitiva e mostra a definição da anomalia correta', async () => {
    const user = userEvent.setup();
    renderGame();
    await predict(user, '75');
    await answer(user, '71', /Nenhuma anomalia/);

    expect(screen.getByRole('status')).toHaveTextContent('Quase lá: você somou 0 de 3 pontos nesta rodada.');
    expect(screen.getByText(ANOMALY_DEFINITION.lost_update)).toBeInTheDocument();
    expect(screen.queryByText(/errad|falh/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Causa:/)).toHaveLength(4);
  });

  it('percorre a sessão até o resumo e permite jogar de novo', async () => {
    const user = userEvent.setup();
    renderGame();
    await predict(user, '71');
    await answer(user, '75', /Perda de atualização/);
    await user.click(screen.getByRole('button', { name: 'Próxima rodada' }));
    await user.type(screen.getByLabelText(/valor final de X\?/), '71');
    await user.click(screen.getByRole('button', { name: 'Confirmar previsão' }));
    await answer(user, '75', /Perda de atualização/);

    expect(screen.getByText(/Você somou/)).toHaveTextContent('6 de 6');
    await user.click(screen.getByRole('button', { name: 'Jogar de novo' }));
    expect(screen.getByRole('button', { name: 'Começar' })).toBeInTheDocument();
  });
});

describe('Detetive do Escalonador - acesso público', () => {
  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );
  }

  it('abre sem login, sem botão Voltar nem layout do app, e nada vai ao backend', async () => {
    const user = userEvent.setup();
    renderAt('/jogo/escalonador');
    await user.click(await screen.findByRole('button', { name: 'Começar' }));

    expect(screen.queryByRole('link', { name: 'Voltar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Menu/ })).not.toBeInTheDocument();
    expect(logEvent).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('a rota de dentro da plataforma continua exigindo login de aluno', () => {
    renderAt('/minigame/scheduler');
    expect(screen.queryByRole('button', { name: 'Começar' })).not.toBeInTheDocument();
  });
});
