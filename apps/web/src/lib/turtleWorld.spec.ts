import { describe, expect, it } from 'vitest';
import type { TurtleAction } from './blockProgram';
import { evaluateSquareGoal, runTurtleProgram } from './turtleWorld';

const squareProgram: TurtleAction[] = [
  { kind: 'move' },
  { kind: 'turn', direction: 'RIGHT' },
  { kind: 'move' },
  { kind: 'turn', direction: 'RIGHT' },
  { kind: 'move' },
  { kind: 'turn', direction: 'RIGHT' },
  { kind: 'move' },
  { kind: 'turn', direction: 'RIGHT' },
];

describe('runTurtleProgram', () => {
  it('starts at the origin facing up, with just the starting point for an empty program', () => {
    const result = runTurtleProgram([]);

    expect(result.points).toEqual([{ x: 0, y: 0 }]);
    expect(result.finalHeadingDeg).toBe(0);
  });

  it('moves forward along the current heading (up = negative y)', () => {
    const result = runTurtleProgram([{ kind: 'move' }], { stepLength: 60 });

    expect(result.points[1].x).toBeCloseTo(0);
    expect(result.points[1].y).toBeCloseTo(-60);
  });

  it('turning RIGHT then moving goes to the right (positive x)', () => {
    const result = runTurtleProgram(
      [{ kind: 'turn', direction: 'RIGHT' }, { kind: 'move' }],
      { stepLength: 60 },
    );

    expect(result.points[1].x).toBeCloseTo(60);
    expect(result.points[1].y).toBeCloseTo(0);
  });

  it('normalizes heading into 0-359 across multiple turns', () => {
    const result = runTurtleProgram([
      { kind: 'turn', direction: 'LEFT' },
      { kind: 'turn', direction: 'LEFT' },
    ]);

    expect(result.finalHeadingDeg).toBe(180);
  });

  it('four move+turn(RIGHT,90°) steps close the path back at the origin, facing up', () => {
    const result = runTurtleProgram(squareProgram, { stepLength: 60, turnDeg: 90 });

    const last = result.points[result.points.length - 1];
    expect(last.x).toBeCloseTo(0);
    expect(last.y).toBeCloseTo(0);
    expect(result.finalHeadingDeg).toBe(0);
  });
});

describe('evaluateSquareGoal', () => {
  const goal = { sides: 4, turnAngleDeg: 90 };

  it('succeeds for a closed square path', () => {
    const result = runTurtleProgram(squareProgram, { stepLength: 60, turnDeg: 90 });

    expect(evaluateSquareGoal(result, goal)).toEqual({ success: true });
  });

  it('fails when there are fewer moves than the goal requires', () => {
    const result = runTurtleProgram(
      [{ kind: 'move' }, { kind: 'turn', direction: 'RIGHT' }, { kind: 'move' }],
      { stepLength: 60 },
    );

    expect(evaluateSquareGoal(result, goal)).toEqual({ success: false });
  });

  it('fails when the path does not close (e.g. a triangle-ish shape with 90° turns)', () => {
    const result = runTurtleProgram(
      [
        { kind: 'move' },
        { kind: 'turn', direction: 'RIGHT' },
        { kind: 'move' },
        { kind: 'turn', direction: 'RIGHT' },
        { kind: 'move' },
      ],
      { stepLength: 60, turnDeg: 90 },
    );

    expect(evaluateSquareGoal(result, goal)).toEqual({ success: false });
  });

  it('fails when the path closes in position but the character ends up facing a different way', () => {
    // Anda os 4 lados do quadrado mas só gira 3 vezes (esquece o último
    // giro): a posição fecha (voltou ao início), mas termina de lado, não de
    // frente pra onde começou — não conta como "desenhou o quadrado".
    const result = runTurtleProgram(
      [
        { kind: 'move' },
        { kind: 'turn', direction: 'RIGHT' },
        { kind: 'move' },
        { kind: 'turn', direction: 'RIGHT' },
        { kind: 'move' },
        { kind: 'turn', direction: 'RIGHT' },
        { kind: 'move' },
      ],
      { stepLength: 60, turnDeg: 90 },
    );

    const last = result.points[result.points.length - 1];
    expect(last.x).toBeCloseTo(0);
    expect(last.y).toBeCloseTo(0);
    expect(result.finalHeadingDeg).not.toBe(0);
    expect(evaluateSquareGoal(result, goal).success).toBe(false);
  });
});
