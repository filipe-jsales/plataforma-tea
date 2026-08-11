import type { ChallengeConfig } from '../../challenges/challenge-config.interface';
import type {
  ChallengeTemplateHandler,
  TemplateValidationContext,
  TemplateValidationError,
  TemplateValidationResult,
} from './challenge-template-handler.interface';

export const REGULAR_POLYGON_TEMPLATE_KEY = 'regular_polygon';

const MIN_SIDES = 3;
const MAX_SIDES = 12;
const MIN_ANGLE = 1;
const MAX_ANGLE = 359;
const MIN_TOLERANCE_PERCENT = 10;
const MAX_TOLERANCE_PERCENT = 100;
// 7.4 (AC3) — margem de erro (px) pra considerar que o traçado do aluno
// fechou a forma. Mínimo 1 (0 exigiria fechamento pixel-perfeito, o mesmo
// problema de coordenação motora fina que already motivou o mínimo de
// snapTolerancePercent); teto 40 é generoso o bastante sem aceitar
// "qualquer rabisco" como forma fechada (o desenho de um polígono do MVP
// tem ~60px por lado, ver DEFAULT_STEP_LENGTH em turtleWorld.ts).
const MIN_CLOSURE_TOLERANCE_PX = 1;
const MAX_CLOSURE_TOLERANCE_PX = 40;
// Um desenho de polígono não existe sem esses dois blocos — checagem de
// domínio, não uma regra genérica de "todo template precisa de N blocos"
// (um template futuro de outra disciplina define os próprios obrigatórios).
const REQUIRED_BLOCK_TYPES = ['move_forward', 'turn'];

// Tamanho dos blocos no editor — 3 opções nomeadas (nunca um número de escala
// exposto ao professor, regra não-negociável 9). O valor numérico vira
// `zoom.startScale` do Blockly em ChallengePage.tsx: 1.3/1.6 ampliam alvo de
// toque e legibilidade do texto do bloco pra quem tem dificuldade de
// coordenação motora fina (mesmo racional de MIN_TOLERANCE_PERCENT acima),
// sem exigir zoom manual do aluno a cada desafio.
const BLOCK_SIZE_SCALES = { small: 1, medium: 1.3, large: 1.6 } as const;
type BlockSizePreset = keyof typeof BLOCK_SIZE_SCALES;
const BLOCK_SIZE_PRESETS = Object.keys(BLOCK_SIZE_SCALES) as BlockSizePreset[];

function isBlockSizePreset(value: unknown): value is BlockSizePreset {
  return typeof value === 'string' && (BLOCK_SIZE_PRESETS as string[]).includes(value);
}

interface RegularPolygonParams {
  sides: number;
  turnAngleDeg: number;
  snapTolerancePercent: number;
  closureTolerancePx: number;
  enabledBlockTypes: string[];
  blockSize: BlockSizePreset;
}

function toFiniteNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

// Regular polygon exterior turn: closes exactly when sides × turnAngle é
// múltiplo de 360°. É a tradução matemática, em linguagem de professor, do
// exemplo literal do card ("3 lados com ângulo externo de 200° não fecha um
// polígono" → 3×200=600, não é múltiplo de 360).
function closesPolygon(sides: number, turnAngleDeg: number): boolean {
  return (sides * turnAngleDeg) % 360 === 0;
}

function suggestedAngleForSides(sides: number): number {
  return Math.round(360 / sides);
}

// Handler do template "Desenhar um polígono regular" (4.2, MVP de
// geometria). Único ponto de código específico deste template — a galeria,
// o formulário genérico e o preview no Pixi são todos reaproveitados do
// motor comum (ver challenge-templates.service.ts). Um template novo
// (outro desenho geométrico, ou de outra disciplina no futuro) implementa
// esta mesma interface e se registra em template-registry.ts, sem tocar em
// mais nada.
export class RegularPolygonTemplateHandler implements ChallengeTemplateHandler {
  readonly key = REGULAR_POLYGON_TEMPLATE_KEY;

  validateParameters(
    raw: Record<string, unknown>,
    context: TemplateValidationContext,
  ): TemplateValidationResult {
    const errors: TemplateValidationError[] = [];

    const sides = toFiniteNumber(raw.sides);
    const turnAngleDeg = toFiniteNumber(raw.turnAngleDeg);
    const snapTolerancePercent = toFiniteNumber(raw.snapTolerancePercent);
    const enabledBlockTypes = toStringArray(raw.enabledBlockTypes);

    const validSides = sides !== null && Number.isInteger(sides) && sides >= MIN_SIDES && sides <= MAX_SIDES;
    if (!validSides) {
      errors.push({
        parameterKey: 'sides',
        message: `Escolha um número de lados entre ${MIN_SIDES} e ${MAX_SIDES}.`,
      });
    }

    const validAngleRange =
      turnAngleDeg !== null && Number.isInteger(turnAngleDeg) && turnAngleDeg >= MIN_ANGLE && turnAngleDeg <= MAX_ANGLE;
    if (!validAngleRange) {
      errors.push({
        parameterKey: 'turnAngleDeg',
        message: `O ângulo de giro em cada lado precisa estar entre ${MIN_ANGLE}° e ${MAX_ANGLE}°.`,
      });
    } else if (validSides && !closesPolygon(sides as number, turnAngleDeg as number)) {
      // AC3 — exatamente o exemplo do card: combinação matematicamente
      // impossível, mensagem descritiva com sugestão de valor válido, nunca
      // "XML inválido"/erro genérico.
      errors.push({
        parameterKey: 'turnAngleDeg',
        message:
          `Com ${sides} lados e ${turnAngleDeg}° de giro a cada lado, o desenho não fecha — ` +
          `o traçado não volta ao ponto de partida. Para ${sides} lados, use ` +
          `${suggestedAngleForSides(sides as number)}° (ou ajuste o número de lados).`,
      });
    }

    const validTolerance =
      snapTolerancePercent !== null &&
      Number.isInteger(snapTolerancePercent) &&
      snapTolerancePercent >= MIN_TOLERANCE_PERCENT &&
      snapTolerancePercent <= MAX_TOLERANCE_PERCENT;
    if (!validTolerance) {
      // AC3 — segundo exemplo literal do card ("tolerância de encaixe do
      // desenho = 0%"): 0% impediria o aluno de encaixar qualquer bloco
      // (RQ4, coordenação motora fina), por isso o mínimo é 10%, não 0.
      errors.push({
        parameterKey: 'snapTolerancePercent',
        message:
          'A tolerância de encaixe não pode ficar em 0% — o aluno não conseguiria encaixar os blocos. ' +
          `Escolha um valor entre ${MIN_TOLERANCE_PERCENT}% e ${MAX_TOLERANCE_PERCENT}% (recomendamos 60%).`,
      });
    }

    const closureTolerancePx = toFiniteNumber(raw.closureTolerancePx);
    const validClosureTolerance =
      closureTolerancePx !== null &&
      Number.isInteger(closureTolerancePx) &&
      closureTolerancePx >= MIN_CLOSURE_TOLERANCE_PX &&
      closureTolerancePx <= MAX_CLOSURE_TOLERANCE_PX;
    if (!validClosureTolerance) {
      // 7.4 (AC3) — mesmo racional do exemplo do card ("figura fechada com
      // margem de erro de X pixels"): 0 exigiria fechamento exato, algo que
      // a coordenação motora fina de montagem de blocos não sustenta (RQ4).
      errors.push({
        parameterKey: 'closureTolerancePx',
        message:
          'A margem de erro para considerar a forma fechada precisa estar entre ' +
          `${MIN_CLOSURE_TOLERANCE_PX} e ${MAX_CLOSURE_TOLERANCE_PX} pixels (recomendamos 5).`,
      });
    }

    if (!isBlockSizePreset(raw.blockSize)) {
      errors.push({
        parameterKey: 'blockSize',
        message: 'Escolha um tamanho de bloco: Pequeno, Médio ou Grande.',
      });
    }

    if (enabledBlockTypes.length === 0) {
      errors.push({
        parameterKey: 'enabledBlockTypes',
        message: 'Selecione ao menos um bloco para este desafio.',
      });
    } else {
      const notIntroduced = enabledBlockTypes.filter(
        (blockType) => !context.introducedBlockTypes.includes(blockType),
      );
      if (notIntroduced.length > 0) {
        errors.push({
          parameterKey: 'enabledBlockTypes',
          message:
            'Este desafio usa um bloco que os alunos ainda não conhecem — apresente-o primeiro ' +
            'num desafio de introdução antes de usá-lo aqui.',
        });
      }
      const missingRequired = REQUIRED_BLOCK_TYPES.filter((blockType) => !enabledBlockTypes.includes(blockType));
      if (missingRequired.length > 0) {
        errors.push({
          parameterKey: 'enabledBlockTypes',
          message: 'Um desafio de polígono precisa dos blocos "Mover para frente" e "Girar" habilitados.',
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  buildChallengeConfig(raw: Record<string, unknown>): ChallengeConfig {
    const params = this.readParams(raw);
    return {
      stage: 'create',
      allowedBlockTypes: params.enabledBlockTypes,
      goal: {
        shape: 'regular_polygon',
        sides: params.sides,
        turnAngleDeg: params.turnAngleDeg,
        closureTolerancePx: params.closureTolerancePx,
      },
      snapTolerancePercent: params.snapTolerancePercent,
      blockScale: BLOCK_SIZE_SCALES[params.blockSize],
    };
  }

  buildPreviewGoal(raw: Record<string, unknown>): Record<string, unknown> {
    const params = this.readParams(raw);
    return { shape: 'regular_polygon', sides: params.sides, turnAngleDeg: params.turnAngleDeg };
  }

  // Só chamado depois de validateParameters devolver valid:true (contrato
  // da interface) — aqui os valores já são garantidamente números/arrays
  // bem formados, sem precisar revalidar.
  private readParams(raw: Record<string, unknown>): RegularPolygonParams {
    return {
      sides: Number(raw.sides),
      turnAngleDeg: Number(raw.turnAngleDeg),
      snapTolerancePercent: Number(raw.snapTolerancePercent),
      closureTolerancePx: Number(raw.closureTolerancePx),
      enabledBlockTypes: toStringArray(raw.enabledBlockTypes),
      blockSize: raw.blockSize as BlockSizePreset,
    };
  }
}
