import { describe, expect, it } from 'vitest';
import { createFractionsRoundStore } from './fractionsRoundStore';

describe('createFractionsRoundStore', () => {
  it('is a factory - two instances never share state', () => {
    const a = createFractionsRoundStore();
    const b = createFractionsRoundStore();

    a.getState().setResult(4, 3);

    expect(b.getState().totalParts).toBeNull();
    expect(b.getState().executed).toBe(false);
  });

  it('starts unexecuted with no parts', () => {
    const store = createFractionsRoundStore();
    expect(store.getState()).toMatchObject({ totalParts: null, deliveredParts: null, executed: false });
  });

  it('setResult marks the round as executed and stores the computed parts', () => {
    const store = createFractionsRoundStore();

    store.getState().setResult(4, 3);

    expect(store.getState()).toMatchObject({ totalParts: 4, deliveredParts: 3, executed: true });
  });

  it('reset clears back to the unexecuted state', () => {
    const store = createFractionsRoundStore();
    store.getState().setResult(4, 3);

    store.getState().reset();

    expect(store.getState()).toMatchObject({ totalParts: null, deliveredParts: null, executed: false });
  });
});
