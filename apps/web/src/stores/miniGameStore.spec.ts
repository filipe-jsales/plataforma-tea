import { describe, expect, it } from 'vitest';
import { createMiniGameStore } from './miniGameStore';

describe('createMiniGameStore', () => {
  it('is a factory — two instances never share state', () => {
    const a = createMiniGameStore();
    const b = createMiniGameStore();
    a.getState().startScene('scene-1', 'concept-1');
    expect(b.getState().activeScene).toBeNull();
  });

  it('starts a scene in the first PRIMM phase (predict), active, 0 attempts', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    const scene = store.getState().activeScene;
    expect(scene).toMatchObject({
      sceneId: 'scene-1',
      conceptId: 'concept-1',
      phase: 'predict',
      attempts: 0,
      status: 'active',
    });
  });

  it('starting a new scene replaces the previous one entirely (single scene at a time, MJ1 AC)', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    store.getState().recordAttempt();
    store.getState().startScene('scene-2', 'concept-2');
    expect(store.getState().activeScene).toMatchObject({ sceneId: 'scene-2', attempts: 0 });
  });

  it('advances through every PRIMM phase in order: predict → run → investigate → modify → make', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    const seen: string[] = [store.getState().activeScene!.phase];
    for (let i = 0; i < 4; i += 1) {
      store.getState().advancePhase();
      seen.push(store.getState().activeScene!.phase);
    }
    expect(seen).toEqual(['predict', 'run', 'investigate', 'modify', 'make']);
  });

  it('marks the scene completed instead of advancing past the final phase (make)', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    for (let i = 0; i < 4; i += 1) store.getState().advancePhase();
    expect(store.getState().activeScene?.phase).toBe('make');

    store.getState().advancePhase();

    expect(store.getState().activeScene).toMatchObject({ phase: 'make', status: 'completed' });
  });

  it('resets attempts to 0 when moving to a new phase', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    store.getState().recordAttempt();
    store.getState().recordAttempt();
    expect(store.getState().activeScene?.attempts).toBe(2);

    store.getState().advancePhase();

    expect(store.getState().activeScene?.attempts).toBe(0);
  });

  it('recordAttempt/advancePhase are no-ops once the scene is completed, never resurrecting it', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    for (let i = 0; i < 5; i += 1) store.getState().advancePhase();
    expect(store.getState().activeScene?.status).toBe('completed');

    store.getState().recordAttempt();
    store.getState().advancePhase();

    expect(store.getState().activeScene).toMatchObject({ phase: 'make', status: 'completed', attempts: 0 });
  });

  it('reset clears the active scene entirely', () => {
    const store = createMiniGameStore();
    store.getState().startScene('scene-1', 'concept-1');
    store.getState().reset();
    expect(store.getState().activeScene).toBeNull();
  });

  it('recordAttempt/advancePhase are no-ops before any scene has started', () => {
    const store = createMiniGameStore();
    store.getState().recordAttempt();
    store.getState().advancePhase();
    expect(store.getState().activeScene).toBeNull();
  });
});
