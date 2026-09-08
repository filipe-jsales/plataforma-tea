// MJ2 (AC "motor de jogo respeita prefers-reduced-motion do sistema
// operacional automaticamente, sem exigir configuração adicional") —
// mesma política já aplicada a toda animação CSS da plataforma
// (theme/sensory-theme.css: "motion só é habilitado quando o próprio
// usuário liga E o SO não pediu reduzir movimento"), mas o Pixi/canvas do
// motor de mini jogo não é afetado por `@media (prefers-reduced-motion)`
// (isso só rege CSS, nunca desenho em canvas) — por isso este helper
// separado, consultado por `MiniGameEngine.getSensory()` a cada decisão de
// animar, nunca cacheado (o aluno pode mudar a preferência do SO com a
// aba aberta).
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
