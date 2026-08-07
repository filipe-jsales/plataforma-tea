// Formatação compartilhada dos componentes de gráfico (6.5) — número com no
// máximo 1 casa decimal, sem casas quando o valor já é inteiro, pra não
// exibir "2.0" onde "2" basta.
export function formatNumber(value: number | null): string {
  if (value === null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
