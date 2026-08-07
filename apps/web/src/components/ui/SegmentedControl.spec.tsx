import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

const options = [
  { value: 'students', label: 'Por aluno' },
  { value: 'summary', label: 'Turma toda' },
];

describe('SegmentedControl', () => {
  it('marks the active option distinctly, not with 2 independently-styled buttons', () => {
    render(
      <SegmentedControl options={options} value="students" onValueChange={vi.fn()} ariaLabel="Visão" />,
    );
    expect(screen.getByRole('radio', { name: 'Por aluno' })).toHaveAttribute('data-state', 'on');
    expect(screen.getByRole('radio', { name: 'Turma toda' })).toHaveAttribute('data-state', 'off');
  });

  it('calls onValueChange when a different option is clicked', async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl options={options} value="students" onValueChange={onValueChange} ariaLabel="Visão" />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Turma toda' }));
    expect(onValueChange).toHaveBeenCalledWith('summary');
  });

  it('never calls onValueChange with an empty value (clicking the active option again cannot deselect everything)', async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl options={options} value="students" onValueChange={onValueChange} ariaLabel="Visão" />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Por aluno' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('labels the group for assistive tech', () => {
    render(
      <SegmentedControl options={options} value="students" onValueChange={vi.fn()} ariaLabel="Visão" />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Visão' })).toBeInTheDocument();
  });
});
