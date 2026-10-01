import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../lib/apiClient';
import { logEvent } from '../../../lib/logEvent';
import { useAuthStore } from '../../../stores/useAuthStore';
import { FractionsGamePage } from './FractionsGamePage';
import type { MiniGameLevelDto } from '../../../lib/miniGameLevelTypes';

vi.mock('../../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../../lib/logEvent', () => ({ logEvent: vi.fn() }));
// MiniGameEngine monta uma Application PixiJS real, que não roda em jsdom —
// mesmo racional de PixiTurtleWorld mockado em ChallengePage.spec.tsx: o
// que este arquivo testa é o COMPORTAMENTO da tela (cartões, feedback não
// punitivo, progressão de nível), não a renderização Pixi.
vi.mock('../../../components/minigame/MiniGameEngine', () => ({
  MiniGameEngine: () => null,
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedLogEvent = vi.mocked(logEvent);

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

const LEVELS: MiniGameLevelDto[] = [
  {
    id: 'l-use',
    category: 'informatica_educacional',
    conceptId: 'fractions_equal_parts',
    stage: 'use',
    position: 1,
    title: 'Observe o pedido pronto',
    prompt: 'Separe metade (1/2) da barra.',
    config: {
      theme: 'chocolate_bar',
      targetFraction: { numerator: 1, denominator: 2 },
      presetSequence: [
        { type: 'choose_whole' },
        { type: 'cut_equal_parts', parts: 2 },
        { type: 'separate_pieces', count: 1 },
        { type: 'deliver_order' },
      ],
    },
  },
  {
    id: 'l-modify',
    category: 'informatica_educacional',
    conceptId: 'fractions_equal_parts',
    stage: 'modify',
    position: 2,
    title: 'Ajuste a sequência',
    prompt: 'Separe um quarto (1/4) da pizza.',
    config: {
      theme: 'pizza',
      targetFraction: { numerator: 1, denominator: 4 },
      presetSequence: [
        { type: 'choose_whole' },
        { type: 'cut_equal_parts', parts: 3 },
        { type: 'separate_pieces', count: 1 },
        { type: 'deliver_order' },
      ],
    },
  },
  {
    id: 'l-create',
    category: 'informatica_educacional',
    conceptId: 'fractions_equal_parts',
    stage: 'create',
    position: 3,
    title: 'Monte o pedido do zero',
    prompt: 'Separe três quartos (3/4) do jardim.',
    config: {
      theme: 'garden',
      targetFraction: { numerator: 3, denominator: 4 },
      fractionPool: [{ numerator: 3, denominator: 4 }],
    },
  },
];

beforeEach(() => {
  mockedGet.mockReset().mockResolvedValue(LEVELS);
  mockedLogEvent.mockReset();
  useAuthStore.setState({ token: 'token', user: studentUser });
});

function renderGame(stage: string) {
  return render(
    <MemoryRouter initialEntries={[`/minigame/fractions/${stage}`]}>
      <Routes>
        <Route path="/minigame/fractions/:stage" element={<FractionsGamePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function dismissBriefing() {
  await userEvent.click(await screen.findByRole('button', { name: 'Começar' }));
}

describe('FractionsGamePage — nível Use', () => {
  it('shows a briefing before the interactive round (MJ3), then a locked/correct sequence that runs to a success message', async () => {
    renderGame('use');
    expect(await screen.findByText('Observe o pedido pronto')).toBeInTheDocument();

    await dismissBriefing();

    // Nível Use: nenhum botão de reordenar (readOnly).
    expect(screen.queryByRole('button', { name: /Subir/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Executar' }));

    expect(await screen.findByText(/2 pedaços iguais, 1 entregue\(s\) ✓/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo pedido' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Próximo nível/ })).toBeInTheDocument();
  });
});

describe('FractionsGamePage — nível Modify', () => {
  it('gives non-punitive retry feedback for the deliberately wrong preset card, never "errado"', async () => {
    renderGame('modify');
    await dismissBriefing();

    await userEvent.click(screen.getByRole('button', { name: 'Executar' }));

    const feedback = await screen.findByText(/o pedido pedia 1\/4/);
    expect(feedback.textContent?.toLowerCase()).not.toMatch(/errado|falhou/);
    expect(screen.queryByRole('button', { name: 'Novo pedido' })).not.toBeInTheDocument();
  });

  it('matches after the student corrects the wrong card via the Select control (MJ4 — no drag-and-drop)', async () => {
    renderGame('modify');
    await dismissBriefing();

    const partsSelect = screen.getByRole('combobox', { name: /Quantas partes/ });
    await userEvent.click(partsSelect);
    await userEvent.click(await screen.findByRole('option', { name: '4' }));

    await userEvent.click(screen.getByRole('button', { name: 'Executar' }));

    expect(await screen.findByText(/4 pedaços iguais, 1 entregue\(s\) ✓/)).toBeInTheDocument();
  });
});

describe('FractionsGamePage — MJ3 (reabrir o roteiro sem perder o progresso)', () => {
  it('reopening the briefing ("Ver roteiro") preserves the edited sequence and result, never resets to the preset', async () => {
    renderGame('modify');
    await dismissBriefing();

    // Corrige o cartão errado e executa — chega num estado de sucesso.
    const partsSelect = screen.getByRole('combobox', { name: /Quantas partes/ });
    await userEvent.click(partsSelect);
    await userEvent.click(await screen.findByRole('option', { name: '4' }));
    await userEvent.click(screen.getByRole('button', { name: 'Executar' }));
    expect(await screen.findByText(/4 pedaços iguais, 1 entregue\(s\) ✓/)).toBeInTheDocument();

    // Reabre o roteiro (MJ3) e continua.
    await userEvent.click(screen.getByRole('button', { name: /Ver roteiro/ }));
    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    // O resultado da rodada e a sequência corrigida (4, não o preset com 3)
    // continuam lá — nada foi resetado ao reabrir/fechar o roteiro.
    expect(await screen.findByText(/4 pedaços iguais, 1 entregue\(s\) ✓/)).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: /Quantas partes/ })).toHaveTextContent('4');
  });
});

describe('FractionsGamePage — nível Create', () => {
  it('starts with an empty sequence and disables Executar until at least one card is added', async () => {
    renderGame('create');
    await dismissBriefing();

    expect(screen.getByRole('button', { name: 'Executar' })).toBeDisabled();

    await userEvent.click(screen.getByText('Escolher o inteiro'));

    expect(screen.getByRole('button', { name: 'Executar' })).toBeEnabled();
  });
});

describe('FractionsGamePage — falha ao carregar os níveis', () => {
  it('shows a retry-friendly message instead of "Carregando…" forever when the levels request fails', async () => {
    mockedGet.mockReset().mockRejectedValue(new Error('Erro 500'));

    renderGame('use');

    expect(await screen.findByText('Erro 500')).toBeInTheDocument();
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });
});
