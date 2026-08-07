// 6.5 — motor de estatística descritiva do relatório de profundidade por
// desafio. Decisão técnica confirmada (ver docs/ai/backlog/
// metricas-professor-admin.md → M5): todo cálculo (média, desvio padrão,
// quartis, histogramas) é feito aqui, em código, a partir de valores brutos
// por aluno já buscados do banco — nunca via SQL agregado (AVG/STDDEV/
// PERCENTILE_CONT do Postgres). Duas razões: mantém a lógica testável com
// dataset conhecido (ver statistics.spec.ts) sem precisar de Postgres real
// rodando, e evita depender de função estatística específica do dialeto do
// banco. Funções puras, sem I/O — quem busca o dado bruto é
// MetricsAdminChallengeService.

export interface DescriptiveStats {
  n: number;
  mean: number | null;
  median: number | null;
  // Desvio padrão AMOSTRAL (denominador n-1, não populacional) — é o que um
  // revisor de artigo espera pra uma amostra de sujeitos, não a população
  // inteira. Nulo quando n<2 (matematicamente indefinido nesse caso, nunca
  // 0 forçado).
  stdDev: number | null;
  min: number | null;
  max: number | null;
  q1: number | null;
  q3: number | null;
}

export interface FrequencyBucket {
  label: string;
  count: number;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Quantil por interpolação linear sobre o array ORDENADO (método R "type 7"
// / default de numpy.percentile) — escolhido de propósito porque é o
// default das duas ferramentas que um pesquisador provavelmente usaria pra
// reproduzir o número a partir do export bruto (6.6): o mesmo `p` aplicado
// aos mesmos dados brutos reproduz exatamente este valor em
// `numpy.percentile(x, p*100)` ou `quantile(x, p)` no R.
function quantile(sortedValues: number[], p: number): number {
  const n = sortedValues.length;
  if (n === 1) return sortedValues[0];
  const index = p * (n - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const fraction = index - lower;
  return sortedValues[lower] + fraction * (sortedValues[upper] - sortedValues[lower]);
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  return quantile([...values].sort((a, b) => a - b), 0.5);
}

export function sampleStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = mean(values)!;
  const sumSquaredDiffs = values.reduce((sum, value) => sum + (value - avg) ** 2, 0);
  return Math.sqrt(sumSquaredDiffs / (values.length - 1));
}

// Bloco comum de todo card de estatística do relatório (AC de 6.5: "todo
// número estatístico... vem acompanhado do N sobre o qual foi calculado").
// N=0 → todos os campos numéricos null, nunca NaN/erro — o componente de
// tela decide o texto "N=0, sem dados" a partir de `n === 0`, não a partir
// de checar cada campo individualmente.
export function describeStats(values: number[]): DescriptiveStats {
  const n = values.length;
  if (n === 0) {
    return { n: 0, mean: null, median: null, stdDev: null, min: null, max: null, q1: null, q3: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n,
    mean: mean(values),
    median: quantile(sorted, 0.5),
    stdDev: sampleStdDev(values),
    min: sorted[0],
    max: sorted[n - 1],
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
  };
}

// Histograma de tentativas (AC de 6.5: "1, 2, 3, 4+") — bucket fixo, não um
// histograma de largura genérica, porque a pergunta de pesquisa é
// especificamente "quantos alunos precisaram de 1/2/3/muitas tentativas",
// não uma distribuição contínua qualquer. Valores <1 (aluno que chegou ao
// desafio mas nunca executou) são EXCLUÍDOS, nunca empurrados pro bucket
// "1" — "0 tentativas" é um dado diferente de "1 tentativa", e não há
// bucket "0" no conjunto pedido pelo AC. A soma dos buckets é, portanto, o
// N implícito deste card especificamente (pode ser menor que o N de
// `describeStats` sobre o mesmo array, que inclui os zeros).
export function bucketizeAttempts(values: number[]): FrequencyBucket[] {
  const buckets: FrequencyBucket[] = [
    { label: '1', count: 0 },
    { label: '2', count: 0 },
    { label: '3', count: 0 },
    { label: '4+', count: 0 },
  ];
  for (const value of values) {
    if (value < 1) continue;
    const index = Math.min(value, 4) - 1;
    buckets[index].count += 1;
  }
  return buckets;
}

// Histograma da taxa de acerto individual (AC de 6.5, bloco Modify/Use):
// eixo X em faixas de 20 pontos percentuais (0-100 em 5 faixas) — granular
// o suficiente pra revelar subgrupos (ex.: "maioria >70%, grupo pequeno
// <30%" cai em faixas distintas), sem virar um histograma de 100 barras de
// 1 aluno cada com N pequeno.
export function bucketizePercentRate(valuesPercent: number[]): FrequencyBucket[] {
  const edges = [0, 20, 40, 60, 80, 100];
  const buckets: FrequencyBucket[] = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    buckets.push({ label: `${edges[i]}-${edges[i + 1]}%`, count: 0 });
  }
  for (const value of valuesPercent) {
    const clamped = Math.min(Math.max(value, 0), 100);
    // Faixa é [low, high), exceto a última ([80,100] inclusiva) — um aluno
    // com 100% de acerto precisa cair em algum bucket, não ficar de fora.
    const bucketIndex = clamped === 100 ? buckets.length - 1 : Math.floor(clamped / 20);
    buckets[bucketIndex].count += 1;
  }
  return buckets;
}

// Tabela de frequência completa (AC de 6.5: "distribuição de frequência
// completa, não só o modo") — ordenada por contagem desc, empate por label
// asc pra saída determinística (útil pro teste e pra não embaralhar a
// ordem das barras entre requisições).
export function frequencyTable(labels: string[]): FrequencyBucket[] {
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// Taxa agregada vs. por-aluno (AC de 6.5: "as duas contam histórias
// diferentes e não devem ser fundidas em um só número"). `ratePercent` é
// null quando n=0 (nunca 0 forçado — 0% de acerto é um dado real, "sem
// dados" é outro).
export interface RateSummary {
  n: number;
  ratePercent: number | null;
}

export function aggregateRate(matched: number, total: number): RateSummary {
  if (total === 0) return { n: 0, ratePercent: null };
  return { n: total, ratePercent: (matched / total) * 100 };
}

export interface PerStudentRateSummary {
  n: number;
  meanPercent: number | null;
  stdDevPercent: number | null;
}

// `ratesPercent` é 1 valor por aluno (a taxa de acerto individual dele),
// não 1 valor por tentativa — n aqui é Nº de alunos, diferente do n de
// `aggregateRate` (Nº de tentativas). Os dois `n` são reportados separados
// de propósito, nunca um único N ambíguo pro card inteiro.
export function summarizePerStudentRates(ratesPercent: number[]): PerStudentRateSummary {
  return {
    n: ratesPercent.length,
    meanPercent: mean(ratesPercent),
    stdDevPercent: sampleStdDev(ratesPercent),
  };
}
