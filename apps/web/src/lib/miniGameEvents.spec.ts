import { describe, expect, it, vi } from 'vitest';
import { logEvent } from './logEvent';
import { logMiniGamePredictAnswered, logMiniGameRoundExecuted } from './miniGameEvents';
import type { MiniGameSceneState } from '../stores/miniGameStore';

vi.mock('./logEvent', () => ({ logEvent: vi.fn() }));
const mockedLogEvent = vi.mocked(logEvent);

function fakeScene(overrides: Partial<MiniGameSceneState> = {}): MiniGameSceneState {
  return {
    sceneId: 'fractions:use',
    conceptId: 'fractions_equal_parts',
    phase: 'run',
    attempts: 0,
    status: 'active',
    startedAt: Date.now(),
    phaseEnteredAt: Date.now(),
    ...overrides,
  };
}

describe('logMiniGameRoundExecuted', () => {
  it('logs RD-P with the miniGameLevelId, sequence and whether it matched the target', () => {
    logMiniGameRoundExecuted('pseudo-1', 'level-1', fakeScene(), {
      sequence: [{ type: 'choose_whole' }],
      matchedTarget: true,
    });

    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        studentPseudoId: 'pseudo-1',
        miniGameLevelId: 'level-1',
        category: 'RD-P',
        type: 'minigame_round_executed',
        payload: expect.objectContaining({
          concept_id: 'fractions_equal_parts',
          matched_target: true,
        }),
      }),
    );
  });
});

describe('logMiniGamePredictAnswered', () => {
  it('logs RD-C with the predicted number of parts', () => {
    logMiniGamePredictAnswered('pseudo-1', 'level-1', fakeScene(), 4);

    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'RD-C',
        type: 'minigame_predict_answered',
        payload: expect.objectContaining({ predicted_parts: 4 }),
      }),
    );
  });
});
