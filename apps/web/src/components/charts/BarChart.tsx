import './charts.css';

export interface BarDatum {
  label: string;
  count: number;
}

interface BarChartProps {
  data: BarDatum[];
  ariaLabel: string;
}

// Barras HORIZONTAIS de propósito: rótulos de categoria deste relatório
// variam de curtos ("1", "2") a longos (`type` de evento, ex.
// "toolbox_rendered") — horizontal evita rótulo rotacionado/cortado
// independente do tamanho do texto (AC de 6.5 não pede layout específico,
// só "gráfico de barras"). Valor no fim da barra (mark spec: "Bars → value
// at the tip").
const CHART_WIDTH = 440;
const LABEL_WIDTH = 170;
const VALUE_WIDTH = 44;
const TRACK_WIDTH = CHART_WIDTH - LABEL_WIDTH - VALUE_WIDTH;
const BAR_HEIGHT = 18;
const ROW_HEIGHT = 30;

export function BarChart({ data, ariaLabel }: BarChartProps) {
  const total = data.reduce((sum, datum) => sum + datum.count, 0);
  if (data.length === 0 || total === 0) {
    return <p className="chart-empty">N=0 — sem dados.</p>;
  }

  const max = Math.max(...data.map((datum) => datum.count), 1);
  const height = data.length * ROW_HEIGHT;

  return (
    <svg
      className="chart-bar"
      viewBox={`0 0 ${CHART_WIDTH} ${height}`}
      role="img"
      aria-label={ariaLabel}
      width="100%"
    >
      <title>{ariaLabel}</title>
      {data.map((datum, index) => {
        const y = index * ROW_HEIGHT;
        const barWidth = datum.count > 0 ? Math.max((datum.count / max) * TRACK_WIDTH, 3) : 0;
        return (
          <g key={datum.label}>
            <title>{`${datum.label}: ${datum.count}`}</title>
            <text
              x={LABEL_WIDTH - 8}
              y={y + BAR_HEIGHT / 2}
              className="chart-bar__label"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {datum.label}
            </text>
            <rect
              x={LABEL_WIDTH}
              y={y}
              width={TRACK_WIDTH}
              height={BAR_HEIGHT}
              rx={4}
              className="chart-bar__track"
            />
            <rect x={LABEL_WIDTH} y={y} width={barWidth} height={BAR_HEIGHT} rx={4} className="chart-bar__fill" />
            <text
              x={LABEL_WIDTH + TRACK_WIDTH + 8}
              y={y + BAR_HEIGHT / 2}
              className="chart-bar__value"
              dominantBaseline="middle"
            >
              {datum.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
