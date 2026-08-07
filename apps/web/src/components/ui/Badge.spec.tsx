import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders the text content', () => {
    render(<Badge variant="success">Concluído</Badge>);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('applies the variant class instead of an inline background-color', () => {
    render(<Badge variant="success">Concluído</Badge>);
    const badge = screen.getByText('Concluído');
    expect(badge).toHaveClass('ui-badge--success');
    expect(badge).not.toHaveAttribute('style');
  });

  it('defaults to the neutral variant', () => {
    render(<Badge>Não iniciado</Badge>);
    expect(screen.getByText('Não iniciado')).toHaveClass('ui-badge--neutral');
  });
});
