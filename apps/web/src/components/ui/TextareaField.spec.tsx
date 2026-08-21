import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TextareaField } from './TextareaField';

describe('TextareaField', () => {
  it('shows a visible text label, not just a placeholder', () => {
    render(<TextareaField id="predict-question" label="Pergunta de Predição" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Pergunta de Predição')).toBeInTheDocument();
  });

  it('calls onChange as the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextareaField id="predict-question" label="Pergunta de Predição" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText('Pergunta de Predição'), 'Oi');

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('renders the error message in an alert region, never only a red border', () => {
    render(
      <TextareaField
        id="predict-question"
        label="Pergunta de Predição"
        value=""
        onChange={vi.fn()}
        error="Escreva a pergunta de Predição."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Escreva a pergunta de Predição.');
  });

  it('defaults to multiple rows, never collapsing to a single-line input', () => {
    render(<TextareaField id="predict-question" label="Pergunta de Predição" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Pergunta de Predição')).toHaveAttribute('rows', '3');
  });
});
