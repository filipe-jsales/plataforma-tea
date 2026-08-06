import type { TurtleAction } from './blockProgram';

export interface Point {
  x: number;
  y: number;
}

export interface TurtleRunResult {
  // Um ponto por posição visitada (incluindo o início) — PixiTurtleWorld
  // desenha um segmento de reta entre cada par consecutivo.
  points: Point[];
  // 0-359, sentido horário, 0 = "para cima" (heading inicial do personagem).
  finalHeadingDeg: number;
}

export interface TurtleRunOptions {
  stepLength?: number;
  turnDeg?: number;
}

const DEFAULT_STEP_LENGTH = 60;
const DEFAULT_TURN_DEG = 90;

// Matemática pura de tartaruga (LOGO-like): dado o programa já interpretado
// (blockProgram.ts), calcula o caminho percorrido. Sem qualquer referência a
// canvas/DOM — PixiTurtleWorld só desenha o resultado, nunca recalcula.
export function runTurtleProgram(
  actions: TurtleAction[],
  options: TurtleRunOptions = {},
): TurtleRunResult {
  const stepLength = options.stepLength ?? DEFAULT_STEP_LENGTH;
  const turnDeg = options.turnDeg ?? DEFAULT_TURN_DEG;

  let headingDeg = 0;
  let x = 0;
  let y = 0;
  const points: Point[] = [{ x, y }];

  for (const action of actions) {
    if (action.kind === 'move') {
      const headingRad = (headingDeg * Math.PI) / 180;
      x += Math.sin(headingRad) * stepLength;
      y -= Math.cos(headingRad) * stepLength;
      points.push({ x, y });
    } else {
      const delta = action.direction === 'RIGHT' ? turnDeg : -turnDeg;
      headingDeg = ((headingDeg + delta) % 360 + 360) % 360;
    }
  }

  return { points, finalHeadingDeg: headingDeg };
}

export interface SquareGoal {
  sides: number;
  turnAngleDeg: number;
}

export interface GoalEvaluation {
  success: boolean;
}

// Tolerância de fechamento em "passos": o caminho não precisa fechar num
// pixel exato, só perto o bastante pra ser reconhecível como a mesma forma
// (mesmo raciocínio de tolerância generosa da regra 3 do editor de blocos,
// aplicado ao resultado visual em vez do encaixe de blocos).
const CLOSE_TOLERANCE_PX = 5;

// Feedback nunca-punitivo (regra não-negociável 4): isto só devolve
// sucesso/não-sucesso, nunca "errado" — a mensagem reversível é
// responsabilidade da tela. Heurística MVP: caminho fechou (voltou perto do
// início) E o personagem terminou de frente pro mesmo lado que começou, com
// pelo menos `sides` movimentos — o suficiente pra reconhecer "desenhou uma
// forma fechada com o número de lados pedido", sem validar geometria exata.
export function evaluateSquareGoal(result: TurtleRunResult, goal: SquareGoal): GoalEvaluation {
  const moveCount = result.points.length - 1;
  if (moveCount < goal.sides) {
    return { success: false };
  }

  const start = result.points[0];
  const end = result.points[result.points.length - 1];
  const closed = Math.hypot(end.x - start.x, end.y - start.y) <= CLOSE_TOLERANCE_PX;
  const headingClosed = result.finalHeadingDeg % 360 === 0;

  return { success: closed && headingClosed };
}
