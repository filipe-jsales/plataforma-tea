import { TriangleAlert } from 'lucide-react';
import {
  describeOp,
  describeResult,
  formatDb,
  type Culprit,
  type Round,
} from '../../../lib/scheduler/engine';
import './ScheduleTable.css';

export interface ScheduleTableProps {
  round: Round;
  // Quantas linhas já foram reveladas; as demais nem entram no DOM.
  revealed: number;
  // Só no feedback: grifa o par de operações que causou o problema.
  showCulprits: boolean;
}

// Tabela Tempo | T1 | T2 | Estado do banco, no formato usado em sala. Os
// culpados são marcados por borda + rótulo "Causa" + texto, nunca só por cor.
export function ScheduleTable({ round, revealed, showCulprits }: ScheduleTableProps) {
  const culpritAt = new Map<number, Culprit>(
    showCulprits ? round.analysis.culprits.map((c) => [c.index, c]) : [],
  );

  return (
    <div className="schedule-table-wrap">
      <table className="schedule-table" aria-label="Escalonamento intercalado">
        <thead>
          <tr>
            <th scope="col">Tempo</th>
            {round.transactions.map((tx) => (
              <th key={tx} scope="col">
                {tx}
              </th>
            ))}
            <th scope="col">Valor no banco</th>
          </tr>
        </thead>
        <tbody>
          {round.steps.slice(0, revealed).map((step, index) => {
            const culprit = culpritAt.get(index);
            const result = describeResult(step);
            return (
              <tr
                key={index}
                className="schedule-table__row"
                data-culprit={culprit ? 'true' : undefined}
                data-latest={index === revealed - 1 ? 'true' : undefined}
              >
                <th scope="row">t{index + 1}</th>
                {round.transactions.map((tx) =>
                  tx === step.op.tx ? (
                    <td key={tx} className="schedule-table__op">
                      <code>{describeOp(step.op)}</code>
                      {result && <span className="schedule-table__result">{result}</span>}
                      {culprit && (
                        <span className="schedule-table__culprit">
                          <TriangleAlert aria-hidden="true" size={16} />
                          <strong>Causa:</strong> {culprit.note}
                        </span>
                      )}
                    </td>
                  ) : (
                    <td key={tx} aria-hidden="true" />
                  ),
                )}
                <td className="schedule-table__db">{formatDb(step.db)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
