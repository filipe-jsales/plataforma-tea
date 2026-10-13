import { describe, expect, it } from 'vitest';
import { buildAgendaSteps } from './sessionAgenda';

describe('buildAgendaSteps (F17)', () => {
  it('marks earlier steps done, the current one, and later ones as next', () => {
    const steps = buildAgendaSteps({ stages: ['use', 'modify', 'create'], currentIndex: 1 });

    expect(steps.map((step) => step.status)).toEqual(['done', 'current', 'next']);
  });

  it('uses student-facing words, never the framework vocabulary (regra não-negociável 3)', () => {
    const labels = buildAgendaSteps({ stages: ['use', 'modify', 'create'], currentIndex: 0 }).map((s) => s.label);

    expect(labels).toEqual(['Ver como funciona', 'Mudar os números', 'Montar sozinho']);
    expect(labels.join(' ').toLowerCase()).not.toMatch(/use|modify|create|primm|predict/);
  });

  it('returns no steps without an agenda or with a single step (nothing to schedule)', () => {
    expect(buildAgendaSteps(null)).toEqual([]);
    expect(buildAgendaSteps(undefined)).toEqual([]);
    expect(buildAgendaSteps({ stages: ['create'], currentIndex: 0 })).toEqual([]);
  });

  it('handles a topic with only use + create (intermediate state) without inventing a modify step', () => {
    const steps = buildAgendaSteps({ stages: ['use', 'create'], currentIndex: 0 });

    expect(steps.map((step) => step.stage)).toEqual(['use', 'create']);
  });
});
