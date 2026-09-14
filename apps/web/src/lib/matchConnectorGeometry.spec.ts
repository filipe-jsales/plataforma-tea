import { describe, expect, it } from 'vitest';
import { computeConnectorLinePoints } from './matchConnectorGeometry';

describe('computeConnectorLinePoints', () => {
  it('anchors the line at the right-middle of the origin card and the left-middle of the destination card', () => {
    const containerRect = { top: 0, left: 0, width: 400, height: 200 };
    const fromRect = { top: 10, left: 0, width: 100, height: 40 };
    const toRect = { top: 60, left: 300, width: 100, height: 40 };

    expect(computeConnectorLinePoints(containerRect, fromRect, toRect)).toEqual({
      x1: 100,
      y1: 30,
      x2: 300,
      y2: 80,
    });
  });

  it('subtracts the container offset, so coordinates are relative to the container, not the viewport', () => {
    const containerRect = { top: 50, left: 20, width: 400, height: 200 };
    const fromRect = { top: 60, left: 20, width: 100, height: 40 };
    const toRect = { top: 110, left: 320, width: 100, height: 40 };

    expect(computeConnectorLinePoints(containerRect, fromRect, toRect)).toEqual({
      x1: 100,
      y1: 30,
      x2: 300,
      y2: 80,
    });
  });

  it('handles a destination card above the origin card (line points upward)', () => {
    const containerRect = { top: 0, left: 0, width: 400, height: 200 };
    const fromRect = { top: 100, left: 0, width: 100, height: 40 };
    const toRect = { top: 10, left: 300, width: 100, height: 40 };

    const points = computeConnectorLinePoints(containerRect, fromRect, toRect);
    expect(points.y1).toBe(120);
    expect(points.y2).toBe(30);
    expect(points.y2).toBeLessThan(points.y1);
  });
});
