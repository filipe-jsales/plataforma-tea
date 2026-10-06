import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createMiniGameStore } from '../stores/miniGameStore';
import { logEvent } from './logEvent';
import { useMiniGameEventLogging } from './useMiniGameEventLogging';

vi.mock('./logEvent', () => ({ logEvent: vi.fn() }));
const mockedLogEvent = vi.mocked(logEvent);

describe('useMiniGameEventLogging (MJ7)', () => {
  it('logs nothing when there is no student (studentPseudoId null)', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    renderHook(() => useMiniGameEventLogging(store, null));
    expect(mockedLogEvent).not.toHaveBeenCalled();
  });

  it('logs minigame_scene_started (RD-P) when a scene is already active on mount', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');

    renderHook(() => useMiniGameEventLogging(store, 'pseudo-1'));

    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        studentPseudoId: 'pseudo-1',
        category: 'RD-P',
        type: 'minigame_scene_started',
        payload: expect.objectContaining({ concept_id: 'concept-1', scene_id: 'scene-1' }),
      }),
    );
  });

  it('logs minigame_scene_started again when a NEW scene starts after the hook is mounted', () => {
    const store = createMiniGameStore();
    renderHook(() => useMiniGameEventLogging(store, 'pseudo-1'));
    mockedLogEvent.mockClear();

    act(() => store.getState().startScene('scene-2', 'concept-2'));

    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'minigame_scene_started',
        payload: expect.objectContaining({ scene_id: 'scene-2' }),
      }),
    );
  });

  it('logs minigame_primm_phase_changed (RD-I) on advancePhase, with from/to', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    renderHook(() => useMiniGameEventLogging(store, 'pseudo-1'));
    mockedLogEvent.mockClear();

    act(() => store.getState().advancePhase());

    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'RD-I',
        type: 'minigame_primm_phase_changed',
        payload: expect.objectContaining({ from_phase: 'predict', to_phase: 'run' }),
      }),
    );
  });

  it('logs minigame_step_retry (RD-I) on recordAttempt within the same phase', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    renderHook(() => useMiniGameEventLogging(store, 'pseudo-1'));
    mockedLogEvent.mockClear();

    act(() => store.getState().recordAttempt());

    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'RD-I',
        type: 'minigame_step_retry',
        payload: expect.objectContaining({ phase: 'predict', attempt_number: 1 }),
      }),
    );
  });

  it('logs minigame_completed (RD-C), never RD-P/RD-I, when the final phase transitions to completed', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    for (let i = 0; i < 4; i += 1) store.getState().advancePhase();
    renderHook(() => useMiniGameEventLogging(store, 'pseudo-1'));
    mockedLogEvent.mockClear();

    act(() => store.getState().advancePhase());

    expect(mockedLogEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'RD-C', type: 'minigame_completed' }),
    );
  });

  it('logs minigame_abandoned (RD-E) on unmount while the scene is still active - never when already completed', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    const { unmount } = renderHook(() => useMiniGameEventLogging(store, 'pseudo-1'));
    mockedLogEvent.mockClear();

    unmount();

    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'RD-E', type: 'minigame_abandoned' }),
    );
  });

  it('never logs minigame_abandoned on unmount when the scene already completed', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    for (let i = 0; i < 5; i += 1) store.getState().advancePhase();
    const { unmount } = renderHook(() => useMiniGameEventLogging(store, 'pseudo-1'));
    mockedLogEvent.mockClear();

    unmount();

    expect(mockedLogEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'minigame_abandoned' }),
    );
  });

  it('never includes clinical-inference language in the abandoned payload - only numeric time (regra não-negociável 7)', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    const { unmount } = renderHook(() => useMiniGameEventLogging(store, 'pseudo-1'));
    mockedLogEvent.mockClear();

    unmount();

    const [[call]] = mockedLogEvent.mock.calls;
    const payload = call.payload as Record<string, unknown>;
    expect(typeof payload.time_in_phase_ms).toBe('number');
    expect(Object.keys(payload)).not.toContain('possible_overload');
    expect(JSON.stringify(payload)).not.toMatch(/sobrecarga|dificuldade|overload/i);
  });
});
