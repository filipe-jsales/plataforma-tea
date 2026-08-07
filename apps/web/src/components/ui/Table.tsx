import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import './Table.css';

export interface TableProps {
  children: ReactNode;
  ariaLabel?: string;
}

// 3.11 — base semântica pra qualquer tabela de dado do professor/admin
// (hoje só TeacherMetrics "Por aluno"). Radix não tem primitivo de tabela
// (não é dialog/tooltip/toggle/tabs, e a semântica de leitor de tela de uma
// tabela de dados de verdade — <table>/<th scope>/<td> — já é o padrão
// correto, headless por natureza); aqui só padronizamos espaçamento/zebra/
// divisor/hierarquia do cabeçalho (Table.css), nunca a semântica.
export function Table({ children, ariaLabel }: TableProps) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table" aria-label={ariaLabel}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="ui-table__head">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="ui-table__row">{children}</tr>;
}

export function TableHeaderCell({
  children,
  ...rest
}: { children: ReactNode } & ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className="ui-table__header-cell" {...rest}>
      {children}
    </th>
  );
}

export function TableCell({
  children,
  ...rest
}: { children: ReactNode } & TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className="ui-table__cell" {...rest}>
      {children}
    </td>
  );
}
