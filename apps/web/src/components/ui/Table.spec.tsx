import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './Table';

describe('Table', () => {
  it('renders a real semantic <table>, never a div-grid pretending to be one', () => {
    render(
      <Table ariaLabel="Progresso da turma">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Aluno</TableHeaderCell>
            <TableHeaderCell>Matrícula</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Ana</TableCell>
            <TableCell>01/02/2026</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const table = screen.getByRole('table', { name: 'Progresso da turma' });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Aluno' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Ana' })).toBeInTheDocument();
  });
});
