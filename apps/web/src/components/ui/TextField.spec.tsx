import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from './TextField';

describe('TextField', () => {
  it('shows a visible text label, not just a placeholder', () => {
    render(<TextField id="name" label="Nome do aluno" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Nome do aluno')).toBeInTheDocument();
  });

  it('calls onChange as the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextField id="name" label="Nome do aluno" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText('Nome do aluno'), 'Ana');

    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('renders the error message in an alert region, never only a red border', () => {
    render(
      <TextField id="name" label="Nome do aluno" value="" onChange={vi.fn()} error="Nome é obrigatório." />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Nome é obrigatório.');
  });
});
