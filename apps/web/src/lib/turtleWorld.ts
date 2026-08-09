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
      // Ângulo por ação (campo ANGLE do bloco "turn", fase Modify 3.4) tem
      // prioridade; `turnDeg` (opção global) é só o fallback pra blocos sem
      // esse campo — mantém 100% compatível com todo caminho que nunca
      // passou `angle` (fase Use, Ajuda, e os testes existentes).
      const stepAngle = action.angle ?? turnDeg;
      const delta = action.direction === 'RIGHT' ? stepAngle : -stepAngle;
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
// aplicado ao resultado visual em vez do encaixe de blocos). Default usado
// pelo currículo semeado (sem `goal.closureTolerancePx`); um desafio criado
// via template (7.4, AC3) pode sobrescrever isso por-desafio — ver
// `toleranceOverridePx` abaixo e `SquareGoalConfig.closureTolerancePx` no
// backend (challenge-config.interface.ts).
const CLOSE_TOLERANCE_PX = 5;

// Fechou de verdade: voltou perto do ponto de partida E terminou de frente
// pro mesmo lado que começou — as duas condições juntas, não só a posição
// (um caminho pode "voltar" ao início de lado, ver teste dedicado). Base de
// `evaluateSquareGoal` (fase Create, meta fixa) e `closedPolygonSides`
// (fase Modify, exploração sem meta fixa) — a mesma checagem de geometria,
// duas perguntas diferentes em cima dela.
function isPathClosed(result: TurtleRunResult, tolerancePx: number): boolean {
  const start = result.points[0];
  const end = result.points[result.points.length - 1];
  const closedPosition = Math.hypot(end.x - start.x, end.y - start.y) <= tolerancePx;
  const closedHeading = result.finalHeadingDeg % 360 === 0;
  return closedPosition && closedHeading;
}

// Feedback nunca-punitivo (regra não-negociável 4): isto só devolve
// sucesso/não-sucesso, nunca "errado" — a mensagem reversível é
// responsabilidade da tela. Heurística MVP: caminho fechou (voltou perto do
// início) E o personagem terminou de frente pro mesmo lado que começou, com
// pelo menos `sides` movimentos — o suficiente pra reconhecer "desenhou uma
// forma fechada com o número de lados pedido", sem validar geometria exata.
export function evaluateSquareGoal(
  result: TurtleRunResult,
  goal: SquareGoal,
  toleranceOverridePx?: number,
): GoalEvaluation {
  const moveCount = result.points.length - 1;
  if (moveCount < goal.sides) {
    return { success: false };
  }

  return { success: isPathClosed(result, toleranceOverridePx ?? CLOSE_TOLERANCE_PX) };
}

// Fase Modify (3.4): não há meta fixa nem avaliação certo/errado — o aluno
// está explorando o efeito de mudar TIMES/ANGLE. Isto só devolve quantos
// lados o traçado fechou com (pra comparar com a previsão do aluno, motor
// PRIMM "Predict" — ver ChallengePage.tsx), `null` quando não fechou (nunca
// vira mensagem de erro na tela, só compõe o log RD-P). Um caminho sem
// nenhum movimento "fecha" trivialmente (início == fim) mas não é um
// polígono — por isso o mínimo de 3 lados.
export function closedPolygonSides(result: TurtleRunResult, toleranceOverridePx?: number): number | null {
  const moveCount = result.points.length - 1;
  if (moveCount < 3 || !isPathClosed(result, toleranceOverridePx ?? CLOSE_TOLERANCE_PX)) {
    return null;
  }
  return moveCount;
}

// Botão "Ajuda" (fase Create, 3.5): mostra a forma-alvo sendo traçada no
// mundo Pixi, gerada só a partir do `goal` numérico (sides/turnAngleDeg) —
// nunca a partir de blocos, então não existe como essa função "vazar" quais
// instruções resolvem o desafio. É um andaime visual (o aluno já viu essa
// mesma forma no Desafio 1 em fase Use), nunca a resposta.
export function buildGoalPreviewPath(goal: SquareGoal, options: TurtleRunOptions = {}): TurtleRunResult {
  const actions: TurtleAction[] = [];
  for (let side = 0; side < goal.sides; side += 1) {
    actions.push({ kind: 'move' });
    actions.push({ kind: 'turn', direction: 'RIGHT' });
  }
  return runTurtleProgram(actions, { ...options, turnDeg: goal.turnAngleDeg });
}
