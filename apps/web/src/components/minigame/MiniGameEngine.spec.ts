import { describe, expect, it } from 'vitest';
import { shouldRestartScene } from './MiniGameEngine';

// MiniGameEngine.tsx em si monta uma Application PixiJS real, que não
// inicializa em jsdom (sem canvas/WebGL - confirmado: `app.init()` lança
// `Cannot read properties of null (reading 'imageSmoothingEnabled')` fora
// de um navegador de verdade). Por isso este arquivo testa só a lógica de
// decisão extraída (`shouldRestartScene`), não o componente inteiro -
// mesmo padrão de PixiTurtleWorld, sempre mockado nos specs que o usam
// (ver ChallengePage.spec.tsx).
describe('shouldRestartScene (MJ3)', () => {
  it('restarts on the very first mount (nenhuma cena ativa ainda)', () => {
    expect(shouldRestartScene(null, 'fractions-factory:use')).toBe(true);
  });

  it('restarts when the next scene has a different id (troca de nível/jogo de verdade)', () => {
    expect(shouldRestartScene('fractions-factory:use', 'fractions-factory:modify')).toBe(true);
  });

  it('does NOT restart when the scene id is unchanged (MiniGameEngine remontou, ex.: reabrir o roteiro - MJ3 AC "sem perder o progresso")', () => {
    expect(shouldRestartScene('fractions-factory:use', 'fractions-factory:use')).toBe(false);
  });
});
