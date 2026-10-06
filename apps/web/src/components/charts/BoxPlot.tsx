import { formatNumber } from './format';
import './charts.css';

export interface DescriptiveStats {
  n: number;
  mean: number | null;
  median: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  q1: number | null;
  q3: number | null;
}

interface BoxPlotProps {
  stats: DescriptiveStats;
  ariaLabel: string;
  unit?: string;
}

const WIDTH = 440;
const HEIGHT = 90;
const PADDING = 36;
const BOX_HEIGHT = 26;

// Whiskers vão até min/max diretamente (variante "min-max boxplot"), não
// até 1.5×IQR com outliers marcados à parte - decisão deliberada: o AC pede
// só min/max/quartis como estatística, e com N tipicamente pequeno neste
// produto (turma/desafio, não milhares de sujeitos) a regra de outlier de
// Tukey tende a marcar o próprio min/max como "outlier" sem agregar leitura
// nova. Reproduzível em R/Python a partir do export bruto (6.6) com
// qualquer convenção de whisker que o pesquisador preferir.
export function BoxPlot({ stats, ariaLabel, unit = '' }: BoxPlotProps) {
  if (stats.n === 0 || stats.min === null || stats.max === null) {
    return <p className="chart-empty">N=0 - sem dados.</p>;
  }
  if (stats.n === 1) {
    return (
      <p className="chart-empty">
        N=1 - valor único ({formatNumber(stats.mean)}
        {unit}); desvio padrão e quartis não são calculáveis com 1 sujeito.
      </p>
    );
  }

  const { min, max, q1, q3, median } = stats;
  const range = max - min || 1;
  const scale = (value: number) => PADDING + ((value - min) / range) * (WIDTH - PADDING * 2);
  const boxY = HEIGHT / 2 - BOX_HEIGHT / 2;

  return (
    <svg className="chart-box" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={ariaLabel} width="100%">
      <title>{ariaLabel}</title>
      <line x1={scale(min)} y1={HEIGHT / 2} x2={scale(max)} y2={HEIGHT / 2} className="chart-box__whisker" />
      <line x1={scale(min)} y1={boxY} x2={scale(min)} y2={boxY + BOX_HEIGHT} className="chart-box__cap" />
      <line x1={scale(max)} y1={boxY} x2={scale(max)} y2={boxY + BOX_HEIGHT} className="chart-box__cap" />
      <rect
        x={scale(q1!)}
        y={boxY}
        width={Math.max(scale(q3!) - scale(q1!), 1)}
        height={BOX_HEIGHT}
        rx={3}
        className="chart-box__box"
      />
      <line
        x1={scale(median!)}
        y1={boxY}
        x2={scale(median!)}
        y2={boxY + BOX_HEIGHT}
        className="chart-box__median"
      />
      <text x={scale(min)} y={HEIGHT - 6} className="chart-box__tick" textAnchor="middle">
        {formatNumber(min)}
      </text>
      <text x={scale(max)} y={HEIGHT - 6} className="chart-box__tick" textAnchor="middle">
        {formatNumber(max)}
      </text>
      <text
        x={scale(median!)}
        y={boxY - 8}
        className="chart-box__tick chart-box__tick--median"
        textAnchor="middle"
      >
        mediana: {formatNumber(median)}
        {unit}
      </text>
    </svg>
  );
}
