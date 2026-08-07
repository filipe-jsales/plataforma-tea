import type { DescriptiveStats } from './BoxPlot';
import { formatNumber } from './format';
import './charts.css';

interface StatListProps {
  stats: DescriptiveStats;
  unit?: string;
}

// Resumo em texto de todo card de estatística (AC de 6.5: "todo número...
// acompanhado do N") — também é a alternativa não-visual ao gráfico
// (leitor de tela, ou só copiar o número pra um artigo sem precisar ler o
// SVG).
export function StatList({ stats, unit = '' }: StatListProps) {
  if (stats.n === 0) {
    return <p className="stat-list stat-list--empty">N=0 — sem dados.</p>;
  }
  return (
    <dl className="stat-list">
      <div className="stat-list__item">
        <dt>N</dt>
        <dd>{stats.n}</dd>
      </div>
      <div className="stat-list__item">
        <dt>Média</dt>
        <dd>
          {formatNumber(stats.mean)}
          {unit}
        </dd>
      </div>
      <div className="stat-list__item">
        <dt>Mediana</dt>
        <dd>
          {formatNumber(stats.median)}
          {unit}
        </dd>
      </div>
      <div className="stat-list__item">
        <dt>Desvio padrão</dt>
        <dd>{stats.stdDev === null ? '— (N<2)' : `${formatNumber(stats.stdDev)}${unit}`}</dd>
      </div>
      <div className="stat-list__item">
        <dt>Mín – Máx</dt>
        <dd>
          {formatNumber(stats.min)} – {formatNumber(stats.max)}
          {unit}
        </dd>
      </div>
      <div className="stat-list__item">
        <dt>Q1 – Q3</dt>
        <dd>
          {formatNumber(stats.q1)} – {formatNumber(stats.q3)}
          {unit}
        </dd>
      </div>
    </dl>
  );
}

interface SampleSizeNoteProps {
  n: number;
  threshold: number;
}

// AC de 6.5: "Sempre que qualquer estatística deste relatório tiver N
// abaixo do configurado, o relatório mostra aviso explícito... em vez de
// apresentar o número sem contexto." Puramente de apresentação — nunca
// esconde/recalcula o número, só adiciona o aviso ao lado.
export function SampleSizeNote({ n, threshold }: SampleSizeNoteProps) {
  if (n === 0 || n >= threshold) return null;
  return (
    <p className="sample-size-note">
      N={n} — abaixo do mínimo configurado ({threshold}); interprete esta estatística com cautela.
    </p>
  );
}
