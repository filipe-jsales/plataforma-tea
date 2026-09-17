import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LikertScaleField } from './LikertScaleField';

describe('LikertScaleField', () => {
  it('shows the statement and the 5 agreement anchors — never bare numbers alone', () => {
    render(<LikertScaleField id="item-1" statement="Foi fácil criar este desafio." value="" onChange={vi.fn()} />);

    expect(screen.getByText('Foi fácil criar este desafio.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Discordo totalmente' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Concordo totalmente' })).toBeInTheDocument();
  });

  it('starts with no option selected when value is empty — partial/no answer is a valid state, never a forced default', () => {
    render(<LikertScaleField id="item-1" statement="Foi fácil criar este desafio." value="" onChange={vi.fn()} />);

    for (const option of ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente']) {
      expect(screen.getByRole('radio', { name: option })).toHaveAttribute('data-state', 'off');
    }
  });

  it('calls onChange with the selected value', async () => {
    const onChange = vi.fn();
    render(<LikertScaleField id="item-1" statement="Foi fácil criar este desafio." value="" onChange={onChange} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Concordo' }));

    expect(onChange).toHaveBeenCalledWith('4');
  });
});
