import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { logEvent } from '../../lib/logEvent';
import { evaluateSquareGoal, closedPolygonSides } from '../../lib/turtleWorld';
import { useAuthStore } from '../../stores/useAuthStore';
import { ChallengePage } from './ChallengePage';

// Mocks mínimos pra rodar ChallengePage fora do Blockly/PixiJS reais (nenhum
// dos dois roda em jsdom): BlocklyWorkspace vira um stub que só entrega uma
// instância de workspace fake pro onInject, com o suficiente pra
// `handleRun` funcionar (getTopBlocks/getAllBlocks); Blockly.serialization.
// blocks.save é mockado pra devolver um programa fixo — o CONTEÚDO do
// programa não importa pra estes testes, porque runTurtleProgram/
// evaluateSquareGoal/closedPolygonSides (a lógica real de turtleWorld.ts,
// já testada em turtleWorld.spec.ts) também são mockados aqui: o que este
// arquivo testa é o COMPORTAMENTO DA TELA (feedback icon+texto, evento
// feedback_shown, mensagem customizável, tolerância repassada), não a
// geometria.
vi.mock('react-blockly', () => ({
  BlocklyWorkspace: (props: { onInject?: (workspace: unknown) => void }) => {
    useEffect(() => {
      const fakeWorkspace = {
        addChangeListener: vi.fn(),
        removeChangeListener: vi.fn(),
        getAllBlocks: () => [],
        getTopBlocks: () => [{}],
        getBlockById: () => null,
      };
      props.onInject?.(fakeWorkspace);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
  },
}));

vi.mock('blockly/core', () => ({
  serialization: { blocks: { save: vi.fn(() => ({ type: 'move_forward' })) } },
  Events: { Abstract: class {}, BlockDrag: class {} },
  FieldNumber: class {},
}));

vi.mock('../../components/challenge/PixiTurtleWorld', () => ({
  PixiTurtleWorld: () => null,
}));

vi.mock('../../lib/blocklyToolbox', () => ({
  applyGenerousSnapTolerance: vi.fn(),
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

vi.mock('../../lib/apiClient', () => ({ apiClient: { get: vi.fn() } }));
vi.mock('../../lib/logEvent', () => ({ logEvent: vi.fn() }));

const mockedGet = vi.mocked(apiClient.get);
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
  feedbackMessages: null,
};

beforeEach(() => {
  mockedGet.mockReset();
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

describe('ChallengePage — feedback (3.7)', () => {
  it('AC1/AC3 — retry feedback combines a neutral icon with descriptive, non-punitive text (default message)', async () => {
    mockedGet.mockResolvedValueOnce(baseCreateChallenge);
    mockedEvaluateSquareGoal.mockReturnValue({ success: false });

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    const message = await screen.findByText('Quase lá — quer tentar de novo?');
    expect(message.textContent?.toLowerCase()).not.toMatch(/errad|errou|falh/);
    // InlineFeedback sempre combina ícone + texto — nunca só a cor/classe.
    expect(screen.getByText('🔁')).toBeInTheDocument();
  });

  it('AC4 — uses the teacher-customized retry message instead of the default when the challenge declares one', async () => {
    mockedGet.mockResolvedValueOnce({
      ...baseCreateChallenge,
      feedbackMessages: { retry: 'Esse ângulo ainda não fecha o quadrado — quer ajustar?', success: null },
    });
    mockedEvaluateSquareGoal.mockReturnValue({ success: false });

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    expect(await screen.findByText('Esse ângulo ainda não fecha o quadrado — quer ajustar?')).toBeInTheDocument();
    expect(screen.queryByText('Quase lá — quer tentar de novo?')).not.toBeInTheDocument();
  });

  it('AC4 — uses the teacher-customized success message when the goal is met', async () => {
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

  it('AC6 — the Modify-phase reflection reuses the same icon+text feedback component', async () => {
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
    // Use/Create — é o MESMO componente reutilizado, não uma reflexão com
    // marcação própria.
    expect(screen.getByText('✅')).toBeInTheDocument();
  });
});

describe('ChallengePage — closure tolerance (7.4 AC3)', () => {
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
