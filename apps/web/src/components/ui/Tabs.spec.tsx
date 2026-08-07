import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs';

const items = [
  { value: 'by-student', label: 'Por aluno', content: <p>Tabela por aluno</p> },
  { value: 'whole-class', label: 'Turma toda', content: <p>Resumo da turma</p> },
];

describe('Tabs', () => {
  it('renders only the active tab content', () => {
    render(<Tabs items={items} value="by-student" onValueChange={vi.fn()} ariaLabel="Visão" />);
    expect(screen.getByText('Tabela por aluno')).toBeInTheDocument();
    expect(screen.queryByText('Resumo da turma')).not.toBeInTheDocument();
  });

  it('calls onValueChange when a tab is clicked', async () => {
    const onValueChange = vi.fn();
    render(<Tabs items={items} value="by-student" onValueChange={onValueChange} ariaLabel="Visão" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Turma toda' }));
    expect(onValueChange).toHaveBeenCalledWith('whole-class');
  });

  it('labels the tablist for assistive tech', () => {
    render(<Tabs items={items} value="by-student" onValueChange={vi.fn()} ariaLabel="Visão" />);
    expect(screen.getByRole('tablist', { name: 'Visão' })).toBeInTheDocument();
  });
});
