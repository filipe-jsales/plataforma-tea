import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logEvent } from './logEvent';
import { RIVER_HINTS } from './riverHints';
import {
  logRiverAbandoned,
  logRiverCrossingAttempted,
  logRiverHintRequested,
  logRiverRestarted,
  logRiverRulesViewed,
} from './riverEvents';

vi.mock('./logEvent', () => ({ logEvent: vi.fn() }));

const mocked = vi.mocked(logEvent);

describe('riverEvents', () => {
  beforeEach(() => mocked.mockClear());

  it('não registra nada sem pseudônimo (sem sessão de aluno)', () => {
    logRiverRulesViewed(null, { origin: 'before_start', round: 2 });
    expect(mocked).not.toHaveBeenCalled();
  });

  it('identifica o jogo e usa a categoria certa em cada tipo', () => {
    logRiverRulesViewed('p1', { origin: 'during_round', round: 1 });
    logRiverRestarted('p1', { round: 2, reason: 'manual_restart', crossingsInAttempt: 3, fuelLeft: 10 });
    logRiverAbandoned('p1', { round: 2, crossings: 3, fuelLeft: 10, hintsUsed: 1, timeInRoundMs: 5000 });

    const calls = mocked.mock.calls.map(([event]) => [event.category, event.type, event.payload?.game]);
    expect(calls).toEqual([
      ['RD-I', 'river_rules_viewed', 'river_crossing'],
      ['RD-I', 'river_restarted', 'river_crossing'],
      ['RD-E', 'river_abandoned', 'river_crossing'],
    ]);
    expect(mocked.mock.calls[0][0].studentPseudoId).toBe('p1');
  });

  it('a travessia tentada leva carga, resultado, regras violadas e gotas', () => {
    logRiverCrossingAttempted('p1', {
      round: 2,
      from: 'E',
      to: 'D',
      cargo: ['sheep'],
      outcome: 'conflict',
      rulesViolated: ['R3', 'R4'],
      fuelAfter: 12,
      crossingNumber: 1,
      invalidSoFar: 1,
      msSincePreviousAction: 800,
    });
    expect(mocked.mock.calls[0][0]).toMatchObject({
      category: 'RD-P',
      type: 'river_crossing_attempted',
      payload: { cargo: ['sheep'], outcome: 'conflict', rules_violated: ['R3', 'R4'], fuel_after: 12 },
    });
  });

  it('o pedido de dica leva número, desconto e quantas dicas já foram usadas', () => {
    logRiverHintRequested('p1', {
      round: 2,
      hintNumber: 3,
      discountPoints: 0.5,
      hintsUsedAfter: 2,
      crossingsSoFar: 4,
      outOfOrder: true,
    });
    expect(mocked.mock.calls[0][0]).toMatchObject({
      category: 'RD-I',
      type: 'river_hint_requested',
      payload: { hint_number: 3, discount_points: 0.5, hints_used_after: 2, out_of_order: true },
    });
  });

  it('nenhum evento carrega texto que interprete o aluno (regra 7)', () => {
    logRiverAbandoned('p1', { round: 1, crossings: 0, fuelLeft: 7, hintsUsed: 0, timeInRoundMs: 1 });
    expect(JSON.stringify(mocked.mock.calls[0][0])).not.toMatch(/sobrecarga|dificuldade|frustra/i);
  });
});

describe('RIVER_HINTS (cartas do plano de aula)', () => {
  it('rodada 1 tem 3 dicas e rodada 2 tem 5, com os descontos do plano', () => {
    expect(RIVER_HINTS[1].map((h) => h.discountPoints)).toEqual([0.25, 0.5, 0.75]);
    expect(RIVER_HINTS[2].map((h) => h.discountPoints)).toEqual([0.25, 0.25, 0.5, 0.5, 0.75]);
    expect(RIVER_HINTS[1].map((h) => h.number)).toEqual([1, 2, 3]);
    expect(RIVER_HINTS[2].map((h) => h.number)).toEqual([1, 2, 3, 4, 5]);
  });
});
