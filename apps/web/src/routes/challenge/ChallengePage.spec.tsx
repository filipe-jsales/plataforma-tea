import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Blockly from 'blockly/core';
import { apiClient } from '../../lib/apiClient';
import { logEvent } from '../../lib/logEvent';
import { evaluateSquareGoal, closedPolygonSides } from '../../lib/turtleWorld';
import { useAuthStore } from '../../stores/useAuthStore';
import { ChallengePage } from './ChallengePage';

// Mocks mínimos pra rodar ChallengePage fora do Blockly/PixiJS reais (nenhum
// dos dois roda em jsdom): BlocklyWorkspace vira um stub que só entrega uma
// instância de workspace fake pro onInject, com o suficiente pra
// `handleRun` funcionar (getTopBlocks/getAllBlocks); Blockly.serialization.
// blocks.save é mockado pra devolver um programa fixo - o CONTEÚDO do
// programa não importa pra estes testes, porque runTurtleProgram/
// evaluateSquareGoal/closedPolygonSides (a lógica real de turtleWorld.ts,
// já testada em turtleWorld.spec.ts) também são mockados aqui: o que este
// arquivo testa é o COMPORTAMENTO DA TELA (feedback icon+texto, evento
// feedback_shown, mensagem customizável, tolerância repassada), não a
// geometria. `workspaceHolder` (via vi.hoisted, pra ficar acessível dentro
// da factory do mock) expõe a instância fake pro corpo dos testes de
// autosave (C2) conseguirem disparar os listeners registrados via
// `addChangeListener` diretamente.
const { workspaceHolder, lastInitialJsonHolder, lastWorkspaceConfigHolder } = vi.hoisted(() => ({
  workspaceHolder: { current: null as null | { addChangeListener: ReturnType<typeof vi.fn> } },
  lastInitialJsonHolder: { current: undefined as unknown },
  lastWorkspaceConfigHolder: { current: undefined as unknown },
}));

vi.mock('react-blockly', () => ({
  BlocklyWorkspace: (props: {
    onInject?: (workspace: unknown) => void;
    initialJson?: unknown;
    workspaceConfiguration?: unknown;
  }) => {
    lastInitialJsonHolder.current = props.initialJson;
    lastWorkspaceConfigHolder.current = props.workspaceConfiguration;
    useEffect(() => {
      const fakeWorkspace = {
        addChangeListener: vi.fn(),
        removeChangeListener: vi.fn(),
        getAllBlocks: () => [],
        getTopBlocks: () => [{}],
        getBlockById: () => null,
      };
      workspaceHolder.current = fakeWorkspace;
      props.onInject?.(fakeWorkspace);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
  },
}));

vi.mock('blockly/core', () => ({
  serialization: { blocks: { save: vi.fn(() => ({ type: 'move_forward' })) } },
  Events: {
    Abstract: class {},
    BlockDrag: class {},
    BlockCreate: class {},
    BlockDelete: class {},
    BlockChange: class {},
    BlockMove: class {},
  },
  FieldNumber: class {},
}));

vi.mock('../../components/challenge/PixiTurtleWorld', () => ({
  PixiTurtleWorld: () => null,
}));

vi.mock('../../lib/blocklyToolbox', () => ({
  applyGenerousSnapTolerance: vi.fn(),
  applyModifyFieldLocking: vi.fn(),
  buildToolboxConfiguration: vi.fn(() => ({})),
  registerBlockDefinitions: vi.fn(),
}));

vi.mock('../../lib/blockProgram', () => ({
  interpretProgram: vi.fn(() => []),
}));

vi.mock('../../lib/turtleWorld', () => ({
  runTurtleProgram: vi.fn(() => ({ points: [{ x: 0, y: 0 }], finalHeadingDeg: 0 })),
  evaluateSquareGoal: vi.fn(),
  closedPolygonSides: vi.fn(() => null),
  buildGoalPreviewPath: vi.fn(() => ({ points: [], finalHeadingDeg: 0 })),
}));

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../lib/logEvent', () => ({ logEvent: vi.fn() }));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedPatch = vi.mocked(apiClient.patch);
const mockedDelete = vi.mocked(apiClient.delete);
const mockedLogEvent = vi.mocked(logEvent);
const mockedEvaluateSquareGoal = vi.mocked(evaluateSquareGoal);
const mockedClosedPolygonSides = vi.mocked(closedPolygonSides);

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

const baseCreateChallenge = {
  id: 'challenge-1',
  title: 'Sua vez!',
  prompt: 'Monte o desenho.',
  locked: false,
  toolbox: { stage: 'create', categories: [] },
  goal: { shape: 'square', sides: 4, turnAngleDeg: 90, closureTolerancePx: 8 },
  program: null,
  investigationQuestion: null,
  predictQuestion: null,
  editableFields: [],
  nextChallengeId: null,
  snapTolerancePercent: null,
  blockScale: null,
  feedbackMessages: null,
};

beforeEach(() => {
  workspaceHolder.current = null;
  lastInitialJsonHolder.current = undefined;
  lastWorkspaceConfigHolder.current = undefined;
  mockedGet.mockReset();
  // C2 - toda tela de desafio não-travada busca o rascunho salvo logo
  // depois de buscar o desafio (2ª chamada de `apiClient.get`); os testes
  // deste arquivo não são sobre autosave, então o valor-padrão (sem
  // rascunho) cobre a 2ª chamada em diante - cada teste só precisa
  // continuar enfileirando a 1ª (`mockResolvedValueOnce(baseCreateChallenge)`).
  mockedGet.mockResolvedValue({ workspaceJson: null });
  mockedPost.mockReset().mockResolvedValue(undefined);
  mockedPatch.mockReset().mockResolvedValue(undefined);
  mockedDelete.mockReset().mockResolvedValue(undefined);
  mockedLogEvent.mockReset();
  mockedEvaluateSquareGoal.mockReset();
  mockedClosedPolygonSides.mockReset().mockReturnValue(null);
  useAuthStore.setState({ token: 'token', user: studentUser });
});

function renderChallenge(challengeId: string) {
  return render(
    <MemoryRouter initialEntries={[`/challenge/${challengeId}`]}>
      <Routes>
        <Route path="/challenge/:challengeId" element={<ChallengePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ChallengePage - feedback (3.7)', () => {
  it('AC1/AC3 - retry feedback combines a neutral icon with descriptive, non-punitive text (default message)', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);
    mockedEvaluateSquareGoal.mockReturnValue({ success: false });

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    const message = await screen.findByText('Quase lá - quer tentar de novo?');
    expect(message.textContent?.toLowerCase()).not.toMatch(/errad|errou|falh/);
    // InlineFeedback sempre combina ícone + texto - nunca só a cor/classe.
    expect(screen.getByText('🔁')).toBeInTheDocument();
  });

  it('AC4 - uses the teacher-customized retry message instead of the default when the challenge declares one', async () => {
    mockedGet.mockResolvedValueOnce({
      ...baseCreateChallenge,
      feedbackMessages: { retry: 'Esse ângulo ainda não fecha o quadrado - quer ajustar?', success: null },
    });
    mockedEvaluateSquareGoal.mockReturnValue({ success: false });

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    expect(await screen.findByText('Esse ângulo ainda não fecha o quadrado - quer ajustar?')).toBeInTheDocument();
    expect(screen.queryByText('Quase lá - quer tentar de novo?')).not.toBeInTheDocument();
  });

  it('AC4 - uses the teacher-customized success message when the goal is met', async () => {
    mockedGet.mockResolvedValueOnce({
      ...baseCreateChallenge,
      feedbackMessages: { retry: null, success: 'Mandou bem! 🎉' },
    });
    mockedEvaluateSquareGoal.mockReturnValue({ success: true });

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    expect(await screen.findByText('Mandou bem! 🎉')).toBeInTheDocument();
  });

  it('feedback_shown (RD-I) is logged with the outcome and stage every time feedback is shown', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);
    mockedEvaluateSquareGoal.mockReturnValue({ success: false });

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    await waitFor(() =>
      expect(mockedLogEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'RD-I',
          type: 'feedback_shown',
          challengeId: 'challenge-1',
          payload: expect.objectContaining({ feedback_type: 'neutral', stage: 'create' }),
        }),
      ),
    );
  });

  it('feedback_shown reports feedback_type "success" when the goal is met, never compared to other students', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);
    mockedEvaluateSquareGoal.mockReturnValue({ success: true });

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    await waitFor(() =>
      expect(mockedLogEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'feedback_shown',
          payload: expect.objectContaining({ feedback_type: 'success' }),
        }),
      ),
    );
    const payloads = mockedLogEvent.mock.calls.map((call) => JSON.stringify(call[0]));
    expect(payloads.some((p) => /other|rank|compar/i.test(p))).toBe(false);
  });

  it('AC6 - the Modify-phase reflection reuses the same icon+text feedback component', async () => {
    mockedGet.mockResolvedValueOnce({
      ...baseCreateChallenge,
      id: 'challenge-2',
      toolbox: { stage: 'modify', categories: [] },
      program: { type: 'repeat_times', fields: { TIMES: 4 } },
      editableFields: [
        { blockType: 'repeat_times', fieldName: 'TIMES', label: 'Lados', min: 3, max: 8 },
      ],
    });
    mockedClosedPolygonSides.mockReturnValue(4);

    renderChallenge('challenge-2');
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    expect(await screen.findByText(/a figura fechou com 4 lados/i)).toBeInTheDocument();
    // Mesmo ícone default de sucesso do InlineFeedback usado no feedback de
    // Use/Create - é o MESMO componente reutilizado, não uma reflexão com
    // marcação própria.
    expect(screen.getByText('✅')).toBeInTheDocument();
  });
});

describe('ChallengePage - closure tolerance (7.4 AC3)', () => {
  it('passes the challenge-configured closureTolerancePx through to the goal/closure evaluation', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);
    mockedEvaluateSquareGoal.mockReturnValue({ success: true });

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    await waitFor(() => expect(mockedEvaluateSquareGoal).toHaveBeenCalled());
    expect(mockedEvaluateSquareGoal.mock.calls[0][2]).toBe(8);
    expect(mockedClosedPolygonSides.mock.calls[0][1]).toBe(8);
  });

  it('passes undefined when the challenge does not customize closureTolerancePx (curriculum-seeded), letting the engine default apply', async () => {
    mockedGet.mockResolvedValueOnce({
      ...baseCreateChallenge,
      goal: { shape: 'square', sides: 4, turnAngleDeg: 90 },
    });
    mockedEvaluateSquareGoal.mockReturnValue({ success: true });

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    await waitFor(() => expect(mockedEvaluateSquareGoal).toHaveBeenCalled());
    expect(mockedEvaluateSquareGoal.mock.calls[0][2]).toBeUndefined();
  });
});

describe('ChallengePage - tamanho dos blocos', () => {
  it('uses the Blockly default scale (1) when the challenge does not customize blockScale (curriculum-seeded)', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);

    renderChallenge('challenge-1');

    await waitFor(() =>
      expect(
        (lastWorkspaceConfigHolder.current as { zoom: { startScale: number } }).zoom.startScale,
      ).toBe(1),
    );
  });

  it('applies the teacher-chosen blockScale as the Blockly startScale for a template-authored challenge', async () => {
    mockedGet.mockResolvedValueOnce({ ...baseCreateChallenge, blockScale: 1.6 });

    renderChallenge('challenge-1');

    await waitFor(() =>
      expect(
        (lastWorkspaceConfigHolder.current as { zoom: { startScale: number } }).zoom.startScale,
      ).toBe(1.6),
    );
  });
});

// Dispara um evento de mudança de CONTEÚDO (nunca UI/seleção) em todo
// listener registrado via `workspace.addChangeListener` - `handleWorkspaceEvent`
// (que só reage a BlockDrag) simplesmente ignora, então isto é seguro pra
// exercitar só o autosave (handleWorkspaceAutosave) sem precisar saber qual
// dos dois listeners é qual.
function fireContentChangeOnAllListeners() {
  const listeners = workspaceHolder.current!.addChangeListener.mock.calls.map(
    (call) => call[0] as (event: unknown) => void,
  );
  const event = new (Blockly as unknown as { Events: { BlockCreate: new () => unknown } }).Events.BlockCreate();
  listeners.forEach((listener) => listener(event));
}

describe('ChallengePage - autosave do workspace (C2)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('AC2 - restores the workspace from the saved draft, taking priority over the curriculum program', async () => {
    mockedGet.mockResolvedValueOnce({
      ...baseCreateChallenge,
      toolbox: { stage: 'modify', categories: [] },
      program: { type: 'move_forward' },
    });
    mockedGet.mockResolvedValueOnce({
      workspaceJson: { type: 'repeat_times', fields: { TIMES: 6 } },
    });

    renderChallenge('challenge-1');
    await screen.findByRole('button', { name: /executar/i });

    expect(lastInitialJsonHolder.current).toEqual({
      blocks: { languageVersion: 0, blocks: [{ type: 'repeat_times', fields: { TIMES: 6 } }] },
    });
  });

  it('falls back to the curriculum program when there is no saved draft yet', async () => {
    mockedGet.mockResolvedValueOnce({
      ...baseCreateChallenge,
      toolbox: { stage: 'modify', categories: [] },
      program: { type: 'move_forward' },
    });
    // 2ª chamada (draft) cai no default do beforeEach: { workspaceJson: null }

    renderChallenge('challenge-1');
    await screen.findByRole('button', { name: /executar/i });

    expect(lastInitialJsonHolder.current).toEqual({
      blocks: { languageVersion: 0, blocks: [{ type: 'move_forward' }] },
    });
  });

  it('never fetches a draft for the locked (`use`) stage - nothing to autosave there', async () => {
    mockedGet.mockResolvedValueOnce({
      ...baseCreateChallenge,
      locked: true,
      toolbox: { stage: 'use', categories: [] },
      program: { type: 'move_forward' },
    });

    renderChallenge('challenge-1');
    await screen.findByRole('button', { name: /executar/i });

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('AC1 - debounces content changes and saves the current workspace only after the aluno stops editing', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);

    renderChallenge('challenge-1');
    await screen.findByRole('button', { name: /executar/i });

    vi.useFakeTimers();
    fireContentChangeOnAllListeners();
    expect(mockedPatch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1499);
    expect(mockedPatch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(mockedPatch).toHaveBeenCalledWith(
      '/students/me/challenges/challenge-1/draft',
      { workspaceJson: { type: 'move_forward' } },
    );
  });

  it('AC1 - a burst of changes resets the debounce, saving only once', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);

    renderChallenge('challenge-1');
    await screen.findByRole('button', { name: /executar/i });

    vi.useFakeTimers();
    fireContentChangeOnAllListeners();
    await vi.advanceTimersByTimeAsync(1000);
    fireContentChangeOnAllListeners();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockedPatch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(mockedPatch).toHaveBeenCalledTimes(1);
  });

  it('AC5 - retries once, silently, after a failed autosave, never surfacing the error to the aluno', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);
    mockedPatch.mockReset();
    mockedPatch.mockRejectedValueOnce(new Error('network down'));
    mockedPatch.mockResolvedValueOnce(undefined);

    renderChallenge('challenge-1');
    await screen.findByRole('button', { name: /executar/i });

    vi.useFakeTimers();
    fireContentChangeOnAllListeners();
    await vi.advanceTimersByTimeAsync(1500);
    await vi.advanceTimersByTimeAsync(4000);

    expect(mockedPatch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/erro|falhou|failed/i)).not.toBeInTheDocument();
  });

  it('AC4 - autosave never renders any "saving…" indicator, on purpose', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);

    renderChallenge('challenge-1');
    await screen.findByRole('button', { name: /executar/i });

    vi.useFakeTimers();
    fireContentChangeOnAllListeners();
    await vi.advanceTimersByTimeAsync(1500);

    expect(screen.queryByText(/salvando/i)).not.toBeInTheDocument();
  });

  it('AC3 - discards the draft once the challenge is completed and submitted, never conflicting with the final result', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);
    mockedEvaluateSquareGoal.mockReturnValue({ success: true });

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    await waitFor(() =>
      expect(mockedDelete).toHaveBeenCalledWith('/students/me/challenges/challenge-1/draft'),
    );
  });

  it('workspace_autosaved (RD-P) is logged after a successful autosave', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);

    renderChallenge('challenge-1');
    await screen.findByRole('button', { name: /executar/i });

    vi.useFakeTimers();
    fireContentChangeOnAllListeners();
    await vi.advanceTimersByTimeAsync(1500);

    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'RD-P',
        type: 'workspace_autosaved',
        challengeId: 'challenge-1',
      }),
    );
  });
});

describe('ChallengePage - marca o desafio como visto (E1, AC2)', () => {
  it('calls the "viewed" endpoint scoped to this challenge as soon as it opens', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);

    renderChallenge('challenge-1');
    await screen.findByRole('button', { name: /executar/i });

    expect(mockedPost).toHaveBeenCalledWith('/students/me/classroom-challenges/challenge-1/viewed');
  });

  it('never blocks the challenge from rendering if marking it viewed fails', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);
    mockedPost.mockRejectedValueOnce(new Error('network down'));

    renderChallenge('challenge-1');

    expect(await screen.findByRole('button', { name: /executar/i })).toBeInTheDocument();
  });
});
