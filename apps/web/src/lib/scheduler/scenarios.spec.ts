import { describe, expect, it } from 'vitest';
import { buildRound } from './engine';
import { buildSession, SCENARIO_TEMPLATES, SESSION_LENGTHS, type Rng } from './scenarios';

function seeded(seed: number): Rng {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('templates de cenário', () => {
  it('o analisador concorda com o tipo declarado em todo template, para muitas sementes', () => {
    for (const template of SCENARIO_TEMPLATES) {
      for (let seed = 1; seed <= 60; seed++) {
        const scenario = { id: template.id, level: template.level, ...template.build(seeded(seed)) };
        const round = buildRound(scenario);
        expect(round.analysis.classification, `${template.id} seed ${seed}`).toBe(template.type);
      }
    }
  });

  it('com anomalia o resultado real difere do serial; nos casos limpos é igual', () => {
    for (const template of SCENARIO_TEMPLATES) {
      for (let seed = 1; seed <= 60; seed++) {
        const round = buildRound({ id: template.id, level: template.level, ...template.build(seeded(seed)) });
        if (template.type === 'none') {
          expect(round.realValue, `${template.id} seed ${seed}`).toBe(round.serialValue);
        } else {
          expect(round.realValue, `${template.id} seed ${seed}`).not.toBe(round.serialValue);
        }
      }
    }
  });
});

describe('buildSession', () => {
  it.each(SESSION_LENGTHS)('sessão de %i rodadas mistura as três anomalias e casos limpos', (length) => {
    const types = new Set(buildSession(length, seeded(length)).map((s) => buildRound(s).analysis.classification));
    expect(types).toEqual(new Set(['lost_update', 'dirty_read', 'incorrect_summary', 'none']));
  });

  it('a dificuldade nunca diminui e a 1ª rodada tem 2 transações e 1 item', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const session = buildSession(8, seeded(seed));
      expect(session).toHaveLength(8);
      session.forEach((s, i) => {
        if (i > 0) expect(s.level).toBeGreaterThanOrEqual(session[i - 1].level);
      });
      expect(buildRound(session[0]).transactions).toHaveLength(2);
      expect(Object.keys(session[0].initial)).toHaveLength(1);
    }
  });

  it('a última rodada envolve 3 transações ou mais de um item', () => {
    const last = buildRound(buildSession(8, seeded(3)).at(-1)!);
    expect(last.transactions.length > 2 || Object.keys(last.scenario.initial).length > 1).toBe(true);
  });
});
