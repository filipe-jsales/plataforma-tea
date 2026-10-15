// Detetive do Escalonador (Banco de Dados II, Unidade III): lógica pura do
// jogo, sem React. Simula um escalonamento intercalado, calcula o resultado
// serial e classifica a anomalia de controle de concorrência. Fica separada
// da tela para ser testada sem DOM e para o cenário nunca "declarar" a
// anomalia por conta própria: quem classifica é `analyzeSchedule`.

export type TxId = 'T1' | 'T2' | 'T3' | 'T4';

export type OpKind =
  | 'read'
  | 'compute'
  | 'write'
  | 'commit'
  | 'rollback'
  | 'sum_init'
  | 'sum_add';

export interface Op {
  tx: TxId;
  kind: OpKind;
  item?: string;
  // compute: item := item + delta (delta negativo vira "-").
  delta?: number;
  // write com valor fixo (ex.: "write_item(B) = 45", como no slide de
  // agregação). Sem `value`, grava a cópia local da transação.
  value?: number;
}

export type AnomalyKind = 'lost_update' | 'dirty_read' | 'incorrect_summary';
export type Classification = AnomalyKind | 'none';

export type Target =
  | { kind: 'item'; item: string }
  | { kind: 'sum'; tx: TxId }
  | { kind: 'read'; tx: TxId; item: string };

export interface Scenario {
  id: string;
  level: 1 | 2 | 3;
  initial: Record<string, number>;
  ops: Op[];
  target: Target;
}

export interface Step {
  op: Op;
  // Estado do banco DEPOIS da operação.
  db: Record<string, number>;
  // read/sum_add: valor lido do banco. compute: novo valor local.
  // write: valor gravado. sum_init/sum_add: soma corrente.
  read?: number;
  local?: number;
  wrote?: number;
  sum?: number;
}

export interface Simulation {
  steps: Step[];
  db: Record<string, number>;
  sums: Partial<Record<TxId, number>>;
  // Primeiro valor lido por (tx, item).
  firstReads: Record<string, number>;
}

export function simulate(initial: Record<string, number>, ops: Op[]): Simulation {
  const db = { ...initial };
  const local: Partial<Record<TxId, Record<string, number>>> = {};
  const sums: Partial<Record<TxId, number>> = {};
  const undo: Partial<Record<TxId, Record<string, number>>> = {};
  const firstReads: Record<string, number> = {};
  const steps: Step[] = [];

  for (const op of ops) {
    const vars = (local[op.tx] ??= {});
    const step: Step = { op, db: {} };
    switch (op.kind) {
      case 'read': {
        const value = db[op.item!];
        vars[op.item!] = value;
        firstReads[`${op.tx}:${op.item}`] ??= value;
        step.read = value;
        break;
      }
      case 'compute': {
        if (vars[op.item!] === undefined) {
          throw new Error(`${op.tx} calcula ${op.item} sem ter lido`);
        }
        vars[op.item!] += op.delta!;
        step.local = vars[op.item!];
        break;
      }
      case 'write': {
        const value = op.value ?? vars[op.item!];
        if (value === undefined) throw new Error(`${op.tx} grava ${op.item} sem valor`);
        const before = (undo[op.tx] ??= {});
        before[op.item!] ??= db[op.item!];
        db[op.item!] = value;
        step.wrote = value;
        break;
      }
      case 'rollback': {
        for (const [item, previous] of Object.entries(undo[op.tx] ?? {})) {
          db[item] = previous;
        }
        break;
      }
      case 'sum_init': {
        sums[op.tx] = 0;
        step.sum = 0;
        break;
      }
      case 'sum_add': {
        const value = db[op.item!];
        firstReads[`${op.tx}:${op.item}`] ??= value;
        sums[op.tx] = (sums[op.tx] ?? 0) + value;
        step.read = value;
        step.sum = sums[op.tx];
        break;
      }
      case 'commit':
        break;
    }
    step.db = { ...db };
    steps.push(step);
  }

  return { steps, db, sums, firstReads };
}

export function evaluateTarget(target: Target, sim: Simulation): number {
  switch (target.kind) {
    case 'item':
      return sim.db[target.item];
    case 'sum':
      return sim.sums[target.tx] ?? 0;
    case 'read':
      return sim.firstReads[`${target.tx}:${target.item}`];
  }
}

// Ordem serial = ordem em que cada transação aparece pela primeira vez no
// escalonamento; é a mesma ordem que o aluno enxerga ao ler T1, T2, T3.
export function serialOps(ops: Op[]): Op[] {
  const order: TxId[] = [];
  for (const op of ops) if (!order.includes(op.tx)) order.push(op.tx);
  return order.flatMap((tx) => ops.filter((op) => op.tx === tx));
}

export function transactionsOf(ops: Op[]): TxId[] {
  const order: TxId[] = [];
  for (const op of ops) if (!order.includes(op.tx)) order.push(op.tx);
  return order;
}

export interface Culprit {
  index: number;
  note: string;
}

export interface Analysis {
  classification: Classification;
  culprits: Culprit[];
}

const isReadOp = (op: Op) => op.kind === 'read' || op.kind === 'sum_add';

export function analyzeSchedule(initial: Record<string, number>, ops: Op[]): Analysis {
  const { steps } = simulate(initial, ops);
  const rolledBack = new Set(ops.filter((op) => op.kind === 'rollback').map((op) => op.tx));

  // 1) Leitura suja: leitura entre a gravação e o rollback de outra transação.
  for (let r = 0; r < ops.length; r++) {
    if (ops[r].kind !== 'rollback') continue;
    const writer = ops[r].tx;
    for (let w = 0; w < r; w++) {
      if (ops[w].tx !== writer || ops[w].kind !== 'write') continue;
      for (let i = w + 1; i < r; i++) {
        if (ops[i].tx !== writer && isReadOp(ops[i]) && ops[i].item === ops[w].item) {
          return {
            classification: 'dirty_read',
            culprits: [
              { index: w, note: `${writer} grava ${steps[w].wrote}, ainda sem commit` },
              { index: i, note: `${ops[i].tx} lê ${steps[i].read}, valor não confirmado` },
              { index: r, note: `${writer} desfaz tudo: o valor ${steps[w].wrote} nunca existiu de fato` },
            ],
          };
        }
      }
    }
  }

  // 2) Perda de atualização: B grava depois de A tendo lido ANTES da gravação
  // de A, então a gravação de A é sobrescrita sem ser considerada.
  for (let wa = 0; wa < ops.length; wa++) {
    const a = ops[wa];
    if (a.kind !== 'write' || rolledBack.has(a.tx)) continue;
    for (let wb = wa + 1; wb < ops.length; wb++) {
      const b = ops[wb];
      if (b.kind !== 'write' || b.tx === a.tx || b.item !== a.item || rolledBack.has(b.tx)) continue;
      let rb = -1;
      for (let i = 0; i < wa; i++) {
        if (ops[i].tx === b.tx && ops[i].kind === 'read' && ops[i].item === a.item) rb = i;
      }
      let ra = -1;
      for (let i = 0; i < wa; i++) {
        if (ops[i].tx === a.tx && ops[i].kind === 'read' && ops[i].item === a.item) ra = i;
      }
      if (rb < 0 || ra < 0) continue;
      return {
        classification: 'lost_update',
        culprits: [
          { index: Math.min(ra, rb), note: `${ops[Math.min(ra, rb)].tx} lê ${steps[Math.min(ra, rb)].read}, o valor antigo` },
          { index: Math.max(ra, rb), note: `${ops[Math.max(ra, rb)].tx} também lê ${steps[Math.max(ra, rb)].read}, o mesmo valor antigo` },
          { index: wa, note: `${a.tx} grava ${steps[wa].wrote}` },
          { index: wb, note: `${b.tx} grava ${steps[wb].wrote} e sobrescreve a gravação de ${a.tx}` },
        ].sort((x, y) => x.index - y.index),
      };
    }
  }

  // 3) Agregação incorreta: quem soma lê alguns itens de um escritor antes da
  // gravação dele e outros depois.
  const aggregators = transactionsOf(ops).filter((tx) => ops.some((op) => op.tx === tx && op.kind === 'sum_add'));
  for (const agg of aggregators) {
    for (const writer of transactionsOf(ops)) {
      if (writer === agg || rolledBack.has(writer)) continue;
      const writeIndex: Record<string, number> = {};
      ops.forEach((op, index) => {
        if (op.tx === writer && op.kind === 'write') writeIndex[op.item!] = index;
      });
      const reads = ops
        .map((op, index) => ({ op, index }))
        .filter(({ op }) => op.tx === agg && op.kind === 'sum_add' && writeIndex[op.item!] !== undefined);
      const oldRead = reads.find(({ op, index }) => index < writeIndex[op.item!]);
      const newRead = reads.find(({ op, index }) => index > writeIndex[op.item!]);
      if (oldRead && newRead) {
        return {
          classification: 'incorrect_summary',
          culprits: [
            { index: oldRead.index, note: `${agg} soma ${oldRead.op.item} ainda com o valor antigo (${steps[oldRead.index].read})` },
            { index: writeIndex[oldRead.op.item!], note: `${writer} atualiza ${oldRead.op.item} depois da leitura` },
            { index: writeIndex[newRead.op.item!], note: `${writer} atualiza ${newRead.op.item} antes da leitura` },
            { index: newRead.index, note: `${agg} soma ${newRead.op.item} já com o valor novo (${steps[newRead.index].read})` },
          ].sort((x, y) => x.index - y.index),
        };
      }
    }
  }

  return { classification: 'none', culprits: [] };
}

export interface Round {
  scenario: Scenario;
  transactions: TxId[];
  steps: Step[];
  serialValue: number;
  realValue: number;
  analysis: Analysis;
}

export function buildRound(scenario: Scenario): Round {
  const real = simulate(scenario.initial, scenario.ops);
  const serial = simulate(scenario.initial, serialOps(scenario.ops));
  return {
    scenario,
    transactions: transactionsOf(scenario.ops),
    steps: real.steps,
    serialValue: evaluateTarget(scenario.target, serial),
    realValue: evaluateTarget(scenario.target, real),
    analysis: analyzeSchedule(scenario.initial, scenario.ops),
  };
}

export function describeOp(op: Op): string {
  switch (op.kind) {
    case 'read':
      return `read_item(${op.item})`;
    case 'compute':
      return `${op.item} := ${op.item} ${op.delta! < 0 ? '-' : '+'} ${Math.abs(op.delta!)}`;
    case 'write':
      return op.value !== undefined ? `write_item(${op.item}) = ${op.value}` : `write_item(${op.item})`;
    case 'commit':
      return 'COMMIT';
    case 'rollback':
      return 'ROLLBACK';
    case 'sum_init':
      return 'sum := 0';
    case 'sum_add':
      return `read_item(${op.item}); sum += ${op.item}`;
  }
}

export function describeResult(step: Step): string | null {
  switch (step.op.kind) {
    case 'read':
      return `lê ${step.read}`;
    case 'compute':
      return `fica ${step.local}`;
    case 'write':
      return `grava ${step.wrote}`;
    case 'sum_add':
      return `lê ${step.read}, soma ${step.sum}`;
    case 'sum_init':
      return 'soma 0';
    default:
      return null;
  }
}

export function formatDb(db: Record<string, number>): string {
  return Object.entries(db)
    .map(([item, value]) => `${item} = ${value}`)
    .join('  ');
}

export function targetQuestion(target: Target, serial: boolean): string {
  const when = serial
    ? 'Se as transações executassem uma após a outra, na ordem em que aparecem'
    : 'Na execução intercalada que você acabou de ver';
  switch (target.kind) {
    case 'item':
      return `${when}, qual seria o valor final de ${target.item}?`;
    case 'sum':
      return `${when}, qual soma ${target.tx} calcularia?`;
    case 'read':
      return `${when}, qual valor ${target.tx} leria de ${target.item}?`;
  }
}
