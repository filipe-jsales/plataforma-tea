import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BoxPlot } from './BoxPlot';

const emptyStats = { n: 0, mean: null, median: null, stdDev: null, min: null, max: null, q1: null, q3: null };

describe('BoxPlot', () => {
  it('shows "N=0 - sem dados" for an empty distribution, never a broken chart', () => {
    render(<BoxPlot stats={emptyStats} ariaLabel="teste" />);
    expect(screen.getByText('N=0 - sem dados.')).toBeInTheDocument();
  });

  it('shows a dedicated N=1 message instead of a degenerate box (stdDev/quartiles undefined)', () => {
    render(
      <BoxPlot
        stats={{ n: 1, mean: 7, median: 7, stdDev: null, min: 7, max: 7, q1: 7, q3: 7 }}
        ariaLabel="teste"
      />,
    );
    expect(screen.getByText(/N=1/)).toBeInTheDocument();
  });

  it('renders the accessible chart with the median labeled for n>=2', () => {
    render(
      <BoxPlot
        stats={{ n: 5, mean: 5.5, median: 5.5, stdDev: 3.03, min: 1, max: 10, q1: 3.25, q3: 7.75 }}
        ariaLabel="Tentativas por aluno"
      />,
    );
    expect(screen.getByRole('img', { name: 'Tentativas por aluno' })).toBeInTheDocument();
    expect(screen.getByText(/mediana: 5.5/)).toBeInTheDocument();
  });
});
