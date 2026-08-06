import { describe, expect, it } from 'vitest';
import type { TurtleAction } from './blockProgram';
import { buildGoalPreviewPath, closedPolygonSides, evaluateSquareGoal, runTurtleProgram } from './turtleWorld';

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

  it('uses the per-action angle (fase Modify, 3.4) instead of the global turnDeg option when present', () => {
    // Triângulo: 3 lados, giro de 120° por vez — vem do campo ANGLE do
    // bloco, não da opção global (que aqui nem é passada).
    const triangleProgram: TurtleAction[] = [
      { kind: 'move' },
      { kind: 'turn', direction: 'RIGHT', angle: 120 },
      { kind: 'move' },
      { kind: 'turn', direction: 'RIGHT', angle: 120 },
      { kind: 'move' },
      { kind: 'turn', direction: 'RIGHT', angle: 120 },
    ];

    const result = runTurtleProgram(triangleProgram, { stepLength: 60 });

    const last = result.points[result.points.length - 1];
    expect(last.x).toBeCloseTo(0);
    expect(last.y).toBeCloseTo(0);
    expect(result.finalHeadingDeg).toBe(0);
  });

  it('falls back to the turnDeg option for a turn action with no angle field', () => {
    const result = runTurtleProgram(
      [{ kind: 'turn', direction: 'RIGHT' }, { kind: 'move' }],
      { stepLength: 60, turnDeg: 45 },
    );

    expect(result.points[1].x).toBeCloseTo(Math.sin((45 * Math.PI) / 180) * 60);
  });
});

describe('closedPolygonSides', () => {
  it('returns the side count for a closed square path', () => {
    const result = runTurtleProgram(squareProgram, { stepLength: 60, turnDeg: 90 });

    expect(closedPolygonSides(result)).toBe(4);
  });

  it('returns the side count for a closed triangle (angle carried per turn action)', () => {
    const triangleProgram: TurtleAction[] = [
      { kind: 'move' },
      { kind: 'turn', direction: 'RIGHT', angle: 120 },
      { kind: 'move' },
      { kind: 'turn', direction: 'RIGHT', angle: 120 },
      { kind: 'move' },
      { kind: 'turn', direction: 'RIGHT', angle: 120 },
    ];

    const result = runTurtleProgram(triangleProgram, { stepLength: 60 });

    expect(closedPolygonSides(result)).toBe(3);
  });

  it('returns the side count for a closed pentagon', () => {
    const pentagonProgram: TurtleAction[] = Array.from({ length: 5 }, () => [
      { kind: 'move' as const },
      { kind: 'turn' as const, direction: 'RIGHT' as const, angle: 72 },
    ]).flat();

    const result = runTurtleProgram(pentagonProgram, { stepLength: 60 });

    expect(closedPolygonSides(result)).toBe(5);
  });

  it('returns null for a path that never closes', () => {
    const result = runTurtleProgram(
      [{ kind: 'move' }, { kind: 'turn', direction: 'RIGHT', angle: 90 }, { kind: 'move' }],
      { stepLength: 60 },
    );

    expect(closedPolygonSides(result)).toBeNull();
  });

  it('returns null for a no-op program instead of treating the trivial start==end as a closed shape', () => {
    expect(closedPolygonSides(runTurtleProgram([]))).toBeNull();
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

describe('buildGoalPreviewPath', () => {
  const goal = { sides: 4, turnAngleDeg: 90 };

  it('produces a path that itself satisfies evaluateSquareGoal — the preview is a real square', () => {
    const result = buildGoalPreviewPath(goal, { stepLength: 60 });

    expect(evaluateSquareGoal(result, goal)).toEqual({ success: true });
  });

  it('never depends on any block/program input — only the numeric goal', () => {
    // Duas chamadas com o mesmo goal produzem exatamente o mesmo caminho,
    // reforçando que não há nenhuma dependência de instruções/blocos aqui —
    // só números (sides/turnAngleDeg), o que é a base do "anda sem entregar
    // a resposta" do botão de Ajuda.
    const first = buildGoalPreviewPath(goal);
    const second = buildGoalPreviewPath(goal);

    expect(first).toEqual(second);
  });

  it('adapts to a different number of sides (e.g. a future triangle goal)', () => {
    const triangleGoal = { sides: 3, turnAngleDeg: 120 };

    const result = buildGoalPreviewPath(triangleGoal, { stepLength: 60 });

    expect(evaluateSquareGoal(result, triangleGoal)).toEqual({ success: true });
  });
});
