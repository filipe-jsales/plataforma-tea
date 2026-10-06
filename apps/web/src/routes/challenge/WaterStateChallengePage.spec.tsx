import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Blockly from 'blockly/core';
import { apiClient } from '../../lib/apiClient';
import { logEvent } from '../../lib/logEvent';
import { useAuthStore } from '../../stores/useAuthStore';
import { WaterStateChallengePage } from './WaterStateChallengePage';

// Mesmo racional de mock de ChallengePage.spec.tsx: BlocklyWorkspace vira
// um stub que só entrega uma instância fake pro onInject/workspaceConfiguration,
// e Blockly.serialization.blocks.save é mockado pra devolver um programa
// fixo - o que este arquivo testa é o COMPORTAMENTO DA TELA (predição
// obrigatória, feedback não-punitivo, log de mudança de limiar), não a
// interpretação em si (já coberta por waterProgram.spec.ts).
const { workspaceHolder, lastWorkspaceConfigHolder } = vi.hoisted(() => ({
  workspaceHolder: { current: null as null | { addChangeListener: ReturnType<typeof vi.fn> } },
  lastWorkspaceConfigHolder: { current: undefined as unknown },
}));

vi.mock('react-blockly', () => ({
  BlocklyWorkspace: (props: { onInject?: (workspace: unknown) => void; workspaceConfiguration?: unknown }) => {
    lastWorkspaceConfigHolder.current = props.workspaceConfiguration;
    useEffect(() => {
      const fakeWorkspace = {
        addChangeListener: vi.fn(),
        removeChangeListener: vi.fn(),
        getTopBlocks: () => [{}],
      };
      workspaceHolder.current = fakeWorkspace;
      props.onInject?.(fakeWorkspace);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
  },
}));

const savedProgramHolder = vi.hoisted(() => ({
  current: {
    type: 'conditional_if',
    fields: { THRESHOLD: 100 },
    inputs: {
      DO_THEN: { block: { type: 'set_water_state', fields: { STATE: 'GAS' } } },
      DO_ELSE: { block: { type: 'set_water_state', fields: { STATE: 'LIQUID' } } },
    },
  } as unknown,
}));

vi.mock('blockly/core', () => ({
  serialization: { blocks: { save: vi.fn(() => savedProgramHolder.current) } },
  Events: {
    Abstract: class {},
    BlockChange: class {
      element?: string;
      name?: string;
      oldValue?: unknown;
      newValue?: unknown;
    },
  },
}));

vi.mock('../../lib/blocklyToolbox', () => ({
  applyGenerousSnapTolerance: vi.fn(),
  applyModifyFieldLocking: vi.fn(),
  registerBlockDefinitions: vi.fn(),
}));

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('../../lib/logEvent', () => ({ logEvent: vi.fn() }));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
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

const baseProgram = {
  type: 'conditional_if',
  fields: { THRESHOLD: 100 },
  inputs: {
    DO_THEN: { block: { type: 'set_water_state', fields: { STATE: 'GAS' } } },
    DO_ELSE: { block: { type: 'set_water_state', fields: { STATE: 'LIQUID' } } },
  },
};

const useChallenge = {
  id: 'challenge-1',
  title: 'Como a água muda de estado?',
  prompt: 'Observe o programa condicional.',
  locked: true,
  toolbox: { stage: 'use', categories: [] },
  goal: { initialTemperatureC: 20, boilingThresholdC: 100 },
  program: baseProgram,
  predictQuestion: 'Em que estado a água vai ficar nessa temperatura?',
  editableFields: [],
  nextChallengeId: null,
  snapTolerancePercent: null,
  blockScale: null,
  feedbackMessages: null,
};

const modifyChallenge = {
  ...useChallenge,
  id: 'challenge-2',
  title: 'Como a água muda de estado? - agora mude!',
  locked: false,
  toolbox: { stage: 'modify', categories: [] },
  editableFields: [
    { blockType: 'conditional_if', fieldName: 'THRESHOLD', label: 'Limiar de ebulição (°C)', min: 80, max: 120 },
  ],
};

beforeEach(() => {
  workspaceHolder.current = null;
  lastWorkspaceConfigHolder.current = undefined;
  savedProgramHolder.current = baseProgram;
  mockedGet.mockReset();
  mockedPost.mockReset().mockResolvedValue(undefined);
  mockedLogEvent.mockReset();
  useAuthStore.setState({ token: 'token', user: studentUser });
});

function renderChallenge(challengeId: string) {
  return render(
    <MemoryRouter initialEntries={[`/water/challenge/${challengeId}`]}>
      <Routes>
        <Route path="/water/challenge/:challengeId" element={<WaterStateChallengePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WaterStateChallengePage - carga inicial (3.13 AC1)', () => {
  it('injects the Blockly workspace read-only when the challenge is stage "use" (locked)', async () => {
    mockedGet.mockResolvedValueOnce(useChallenge);

    renderChallenge('challenge-1');

    await waitFor(() =>
      expect((lastWorkspaceConfigHolder.current as { readOnly: boolean }).readOnly).toBe(true),
    );
  });

  it('does not show the run button before the student predicts a state', async () => {
    mockedGet.mockResolvedValueOnce(useChallenge);

    renderChallenge('challenge-1');

    expect(await screen.findByText(useChallenge.predictQuestion)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /executar/i })).not.toBeInTheDocument();
  });
});

describe('WaterStateChallengePage - previsão obrigatória (3.13 AC2)', () => {
  it('unlocks the run button only after the student picks a predicted state', async () => {
    mockedGet.mockResolvedValueOnce(useChallenge);

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /líquido/i }));

    expect(await screen.findByRole('button', { name: /executar/i })).toBeInTheDocument();
  });

  it('3.13 (RD-C) - logs the prediction and the actual result together on Executar', async () => {
    mockedGet.mockResolvedValueOnce(useChallenge);

    renderChallenge('challenge-1');
    await userEvent.click(await screen.findByRole('button', { name: /líquido/i }));
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    await waitFor(() =>
      expect(mockedLogEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'RD-C',
          type: 'water_state_prediction',
          payload: expect.objectContaining({
            prediction_given: 'LIQUID',
            actual_state: 'LIQUID',
            result_matched_prediction: true,
          }),
        }),
      ),
    );
  });
});

describe('WaterStateChallengePage - feedback não-punitivo (3.13 AC4)', () => {
  it('describes the divergence between prediction and result, never "errado"/punitive language', async () => {
    mockedGet.mockResolvedValueOnce(useChallenge);

    renderChallenge('challenge-1');
    // Temperatura inicial (20°C) fica no ramo SENÃO (líquido) - prevendo
    // "gasoso" diverge do resultado real.
    await userEvent.click(await screen.findByRole('button', { name: /gasoso/i }));
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    const message = await screen.findByText(/você imaginou/i);
    expect(message.textContent?.toLowerCase()).toContain('líquido');
    expect(message.textContent?.toLowerCase()).not.toMatch(/errad|errou|falh/);
  });
});

describe('WaterStateChallengePage - fase modify (3.14)', () => {
  it('AC1 - the conditional structure is locked but the threshold field stays editable (applyModifyFieldLocking is applied)', async () => {
    mockedGet.mockResolvedValueOnce(modifyChallenge);

    renderChallenge('challenge-2');

    await waitFor(() =>
      expect((lastWorkspaceConfigHolder.current as { readOnly: boolean }).readOnly).toBe(false),
    );
  });

  it('AC4 - logs challenge_modify_attempt with changed_values on Executar', async () => {
    mockedGet.mockResolvedValueOnce(modifyChallenge);

    renderChallenge('challenge-2');
    await userEvent.click(await screen.findByRole('button', { name: /líquido/i }));
    await userEvent.click(await screen.findByRole('button', { name: /executar/i }));

    await waitFor(() =>
      expect(mockedLogEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'RD-P',
          type: 'challenge_modify_attempt',
          payload: expect.objectContaining({ changed_values: expect.any(Object) }),
        }),
      ),
    );
  });

  it('AC4 - logs thresholdChanged (RD-I) with previous/new value when the field itself changes', async () => {
    mockedGet.mockResolvedValueOnce(modifyChallenge);

    renderChallenge('challenge-2');
    await screen.findByText(modifyChallenge.predictQuestion);

    const listener = workspaceHolder.current!.addChangeListener.mock.calls[0][0] as (event: unknown) => void;
    const event = new Blockly.Events.BlockChange();
    event.element = 'field';
    event.name = 'THRESHOLD';
    event.oldValue = 100;
    event.newValue = 90;
    listener(event);

    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'RD-I',
        type: 'thresholdChanged',
        payload: expect.objectContaining({ previous_value: 100, new_value: 90 }),
      }),
    );
  });

  it('never logs thresholdChanged for a field not declared in editableFields', async () => {
    mockedGet.mockResolvedValueOnce(modifyChallenge);

    renderChallenge('challenge-2');
    await screen.findByText(modifyChallenge.predictQuestion);

    const listener = workspaceHolder.current!.addChangeListener.mock.calls[0][0] as (event: unknown) => void;
    const event = new Blockly.Events.BlockChange();
    event.element = 'field';
    event.name = 'SOME_OTHER_FIELD';
    listener(event);

    expect(mockedLogEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'thresholdChanged' }),
    );
  });
});

describe('WaterStateChallengePage - marca o desafio como visto (E1)', () => {
  it('posts the viewed marker once the challenge loads', async () => {
    mockedGet.mockResolvedValueOnce(useChallenge);

    renderChallenge('challenge-1');

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/students/me/classroom-challenges/challenge-1/viewed'),
    );
  });
});
