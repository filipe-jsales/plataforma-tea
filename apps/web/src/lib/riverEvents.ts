import { logEvent, type EventCategory } from './logEvent';
import type { Bank, CrossingOutcome, PieceId, RoundId } from './riverCrossing';

// Vocabulário de eventos da "Travessia do Rio". Mesmas 5 categorias RD-* e
// mesmo `POST /events` dos demais jogos (regra não-negociável 6); o jogo não
// tem nível no banco, então não há `miniGameLevelId` e o `game` no payload
// identifica a origem. Só dados brutos observáveis (regra 7): nenhum campo
// interpreta dificuldade ou estado do aluno.

const GAME = 'river_crossing';

function emit(
  studentPseudoId: string | null,
  category: EventCategory,
  type: string,
  payload: Record<string, unknown>,
): void {
  if (!studentPseudoId) return;
  logEvent({
    studentPseudoId,
    category,
    type,
    payload: { game: GAME, ...payload, timestamp: new Date().toISOString() },
  });
}

export type RoundStartReason = 'first_start' | 'manual_restart' | 'after_out_of_fuel' | 'after_win' | 'next_round';
export type RulesOrigin = 'before_start' | 'during_round';

// RD-P - uma rodada começou (ou recomeçou).
export function logRiverRoundStarted(
  id: string | null,
  d: { round: RoundId; reason: RoundStartReason; roundAttempt: number },
): void {
  emit(id, 'RD-P', 'river_round_started', {
    round: d.round,
    reason: d.reason,
    round_attempt: d.roundAttempt,
  });
}

// RD-I - colocar/tirar um personagem do barco.
export function logRiverCargoChanged(
  id: string | null,
  d: { round: RoundId; action: 'load' | 'unload'; piece: PieceId; cargo: PieceId[] },
): void {
  emit(id, 'RD-I', 'river_cargo_changed', {
    round: d.round,
    action: d.action,
    piece: d.piece,
    cargo_after: d.cargo,
  });
}

// RD-I - tentou colocar um personagem que não cabe no barco.
export function logRiverCargoRejected(
  id: string | null,
  d: { round: RoundId; piece: PieceId; cargo: PieceId[] },
): void {
  emit(id, 'RD-I', 'river_cargo_rejected_overweight', {
    round: d.round,
    piece: d.piece,
    cargo: d.cargo,
  });
}

// RD-P - cada travessia tentada, válida ou não (a gota é gasta nas duas).
export function logRiverCrossingAttempted(
  id: string | null,
  d: {
    round: RoundId;
    from: Bank;
    to: Bank;
    cargo: PieceId[];
    outcome: CrossingOutcome;
    rulesViolated: string[];
    fuelAfter: number;
    crossingNumber: number;
    invalidSoFar: number;
    msSincePreviousAction: number;
  },
): void {
  emit(id, 'RD-P', 'river_crossing_attempted', {
    round: d.round,
    from_bank: d.from,
    to_bank: d.to,
    cargo: d.cargo,
    outcome: d.outcome,
    rules_violated: d.rulesViolated,
    fuel_after: d.fuelAfter,
    crossing_number: d.crossingNumber,
    invalid_attempts_so_far: d.invalidSoFar,
    ms_since_previous_action: d.msSincePreviousAction,
  });
}

// RD-C - resultado curricular da rodada.
export function logRiverRoundCompleted(
  id: string | null,
  d: { round: RoundId; crossings: number; invalidAttempts: number; fuelLeft: number; hintsUsed: number; durationMs: number },
): void {
  emit(id, 'RD-C', 'river_round_completed', {
    round: d.round,
    crossings: d.crossings,
    invalid_attempts: d.invalidAttempts,
    fuel_left: d.fuelLeft,
    hints_used: d.hintsUsed,
    duration_ms: d.durationMs,
  });
}

// RD-C - o tanque esvaziou antes de todos chegarem.
export function logRiverFuelDepleted(
  id: string | null,
  d: { round: RoundId; crossings: number; invalidAttempts: number; hintsUsed: number; durationMs: number },
): void {
  emit(id, 'RD-C', 'river_fuel_depleted', {
    round: d.round,
    crossings: d.crossings,
    invalid_attempts: d.invalidAttempts,
    hints_used: d.hintsUsed,
    duration_ms: d.durationMs,
  });
}

// RD-I - pediu uma dica (só na primeira vez que a carta é virada).
export function logRiverHintRequested(
  id: string | null,
  d: {
    round: RoundId;
    hintNumber: number;
    discountPoints: number;
    hintsUsedAfter: number;
    crossingsSoFar: number;
    outOfOrder: boolean;
  },
): void {
  emit(id, 'RD-I', 'river_hint_requested', {
    round: d.round,
    hint_number: d.hintNumber,
    discount_points: d.discountPoints,
    hints_used_after: d.hintsUsedAfter,
    crossings_so_far: d.crossingsSoFar,
    out_of_order: d.outOfOrder,
  });
}

// RD-I - recomeçar (botão, depois de fim de combustível ou depois de vencer).
export function logRiverRestarted(
  id: string | null,
  d: { round: RoundId; reason: Exclude<RoundStartReason, 'first_start' | 'next_round'>; crossingsInAttempt: number; fuelLeft: number },
): void {
  emit(id, 'RD-I', 'river_restarted', {
    round: d.round,
    reason: d.reason,
    crossings_in_attempt: d.crossingsInAttempt,
    fuel_left: d.fuelLeft,
  });
}

// RD-I - abriu a tela de regras.
export function logRiverRulesViewed(id: string | null, d: { origin: RulesOrigin; round: RoundId }): void {
  emit(id, 'RD-I', 'river_rules_viewed', { origin: d.origin, round: d.round });
}

// RD-I - voltou da tela de regras para a travessia em andamento.
export function logRiverRulesResumed(id: string | null, d: { round: RoundId; viewDurationMs: number }): void {
  emit(id, 'RD-I', 'river_rules_resumed', { round: d.round, view_duration_ms: d.viewDurationMs });
}

// RD-I - abriu o link de um dos formulários do estudo na tela final.
export function logRiverSurveyLinkOpened(id: string | null, d: { form: 'qual' | 'quant'; round: RoundId }): void {
  emit(id, 'RD-I', 'river_survey_link_opened', { form: d.form, round: d.round });
}

// RD-I - ligou/desligou o som.
export function logRiverSoundToggled(id: string | null, d: { enabled: boolean }): void {
  emit(id, 'RD-I', 'river_sound_toggled', { enabled: d.enabled });
}

// RD-E - saiu da tela com a rodada em andamento. Só números brutos.
export function logRiverAbandoned(
  id: string | null,
  d: { round: RoundId; crossings: number; fuelLeft: number; hintsUsed: number; timeInRoundMs: number },
): void {
  emit(id, 'RD-E', 'river_abandoned', {
    round: d.round,
    crossings: d.crossings,
    fuel_left: d.fuelLeft,
    hints_used: d.hintsUsed,
    time_in_round_ms: d.timeInRoundMs,
  });
}
