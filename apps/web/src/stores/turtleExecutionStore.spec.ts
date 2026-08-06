import { describe, expect, it } from 'vitest';
import { createTurtleExecutionStore } from './turtleExecutionStore';

const points = [
  { x: 0, y: 0 },
  { x: 0, y: -60 },
  { x: 60, y: -60 },
];

describe('createTurtleExecutionStore', () => {
  it('starts idle with no points', () => {
    const useStore = createTurtleExecutionStore();

    expect(useStore.getState()).toMatchObject({
      points: [],
      status: 'idle',
      stepIndex: 0,
      runToken: 0,
    });
  });

  it('each call to createTurtleExecutionStore returns an independent store', () => {
    const a = createTurtleExecutionStore();
    const b = createTurtleExecutionStore();

    a.getState().play(points, false);

    expect(a.getState().points).toEqual(points);
    expect(b.getState().points).toEqual([]);
  });

  describe('play', () => {
    it('animate=true jumps straight to "playing" (PixiTurtleWorld animates on its own)', () => {
      const useStore = createTurtleExecutionStore();

      useStore.getState().play(points, true);

      expect(useStore.getState()).toMatchObject({ points, animate: true, status: 'playing', stepIndex: 0 });
    });

    it('animate=false (default sensory profile) starts in "stepping" at stepIndex 0 — no auto-advance', () => {
      const useStore = createTurtleExecutionStore();

      useStore.getState().play(points, false);

      expect(useStore.getState()).toMatchObject({ points, animate: false, status: 'stepping', stepIndex: 0 });
    });

    it('animate=false with an empty (no-op) program goes straight to "idle" — nothing to step through', () => {
      const useStore = createTurtleExecutionStore();

      useStore.getState().play([{ x: 0, y: 0 }], false);

      expect(useStore.getState().status).toBe('idle');
    });

    it('increments runToken on every call, even with the same points ("Repetir execução")', () => {
      const useStore = createTurtleExecutionStore();

      useStore.getState().play(points, false);
      const firstToken = useStore.getState().runToken;
      useStore.getState().play(points, false);

      expect(useStore.getState().runToken).toBe(firstToken + 1);
    });
  });

  describe('advanceStep', () => {
    it('moves the step index forward one point at a time', () => {
      const useStore = createTurtleExecutionStore();
      useStore.getState().play(points, false);

      useStore.getState().advanceStep();

      expect(useStore.getState().stepIndex).toBe(1);
      expect(useStore.getState().status).toBe('stepping');
    });

    it('settles on "idle" once the last point is reached, and never advances past it', () => {
      const useStore = createTurtleExecutionStore();
      useStore.getState().play(points, false);

      useStore.getState().advanceStep();
      useStore.getState().advanceStep();
      useStore.getState().advanceStep();

      expect(useStore.getState().stepIndex).toBe(2);
      expect(useStore.getState().status).toBe('idle');
    });

    it('is a no-op when there are no points yet', () => {
      const useStore = createTurtleExecutionStore();

      useStore.getState().advanceStep();

      expect(useStore.getState().stepIndex).toBe(0);
    });
  });

  describe('reset', () => {
    it('clears points and step index back to idle', () => {
      const useStore = createTurtleExecutionStore();
      useStore.getState().play(points, true);

      useStore.getState().reset();

      expect(useStore.getState()).toMatchObject({ points: [], status: 'idle', stepIndex: 0 });
    });
  });
});
