import { describe, expect, it } from 'vitest';
import { computeCardPlacement } from './tourPositioning';

const viewport = { width: 1024, height: 768 };
const card = { width: 320, height: 160 };

describe('computeCardPlacement', () => {
  it('places the card below the target when there is room', () => {
    const target = { top: 100, left: 400, width: 200, height: 40 };

    const result = computeCardPlacement(target, viewport, card);

    expect(result.placement).toBe('bottom');
    expect(result.top).toBe(100 + 40 + 12);
  });

  it('places the card above the target when it does not fit below but fits above', () => {
    const target = { top: 700, left: 400, width: 200, height: 40 };

    const result = computeCardPlacement(target, viewport, card);

    expect(result.placement).toBe('top');
    expect(result.top).toBe(700 - 160 - 12);
  });

  it('centers the card horizontally over the target when there is room on both sides', () => {
    const target = { top: 100, left: 400, width: 200, height: 40 };

    const result = computeCardPlacement(target, viewport, card);

    expect(result.left).toBe(400 + 200 / 2 - 320 / 2);
  });

  it('clamps the card to the left viewport margin instead of letting it overflow off-screen', () => {
    const target = { top: 100, left: 0, width: 40, height: 40 };

    const result = computeCardPlacement(target, viewport, card);

    expect(result.left).toBe(16);
  });

  it('clamps the card to the right viewport margin instead of letting it overflow off-screen', () => {
    const target = { top: 100, left: 1000, width: 20, height: 40 };

    const result = computeCardPlacement(target, viewport, card);

    expect(result.left).toBe(viewport.width - card.width - 16);
  });

  it('never places the card above the top viewport margin, even for a target near the top edge with no room above', () => {
    const target = { top: 5, left: 400, width: 200, height: 700 };

    const result = computeCardPlacement(target, viewport, card);

    expect(result.top).toBeGreaterThanOrEqual(16);
  });
});
