import './charts.css';

export interface ScatterPoint {
  x: number;
  y: number;
}

interface ScatterPlotProps {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  ariaLabel: string;
}

const WIDTH = 440;
const HEIGHT = 260;
const PADDING_LEFT = 48;
const PADDING_BOTTOM = 40;
const PADDING_TOP = 16;
const PADDING_RIGHT = 16;

// 1 ponto = 1 aluno (AC de 6.5). `fill-opacity` < 1 (ver charts.css) é o
// único mecanismo de legibilidade contra sobreposição — com N pequeno
// (turma/desafio, não milhares de sujeitos) não vale a pena um algoritmo de
// jitter/agrupamento, o ponto mais escuro já comunica "mais de um aluno
// aqui".
export function ScatterPlot({ points, xLabel, yLabel, ariaLabel }: ScatterPlotProps) {
  if (points.length === 0) {
    return <p className="chart-empty">N=0 — sem dados.</p>;
  }

  const xMax = Math.max(...points.map((point) => point.x), 1);
  const yMax = Math.max(...points.map((point) => point.y), 1);
  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const scaleX = (x: number) => PADDING_LEFT + (x / xMax) * plotWidth;
  const scaleY = (y: number) => HEIGHT - PADDING_BOTTOM - (y / yMax) * plotHeight;

  return (
    <svg className="chart-scatter" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={ariaLabel} width="100%">
      <title>{ariaLabel}</title>
      <line
        x1={PADDING_LEFT}
        y1={HEIGHT - PADDING_BOTTOM}
        x2={WIDTH - PADDING_RIGHT}
        y2={HEIGHT - PADDING_BOTTOM}
        className="chart-scatter__axis"
      />
      <line
        x1={PADDING_LEFT}
        y1={HEIGHT - PADDING_BOTTOM}
        x2={PADDING_LEFT}
        y2={PADDING_TOP}
        className="chart-scatter__axis"
      />
      <text x={WIDTH / 2} y={HEIGHT - 8} className="chart-scatter__axis-label" textAnchor="middle">
        {xLabel}
      </text>
      <text
        x={14}
        y={HEIGHT / 2}
        className="chart-scatter__axis-label"
        textAnchor="middle"
        transform={`rotate(-90 14 ${HEIGHT / 2})`}
      >
        {yLabel}
      </text>
      {points.map((point, index) => (
        <circle key={index} cx={scaleX(point.x)} cy={scaleY(point.y)} r={5} className="chart-scatter__point">
          <title>{`${xLabel}: ${point.x} · ${yLabel}: ${point.y.toFixed(0)}%`}</title>
        </circle>
      ))}
    </svg>
  );
}
