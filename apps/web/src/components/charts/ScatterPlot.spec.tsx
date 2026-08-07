import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScatterPlot } from './ScatterPlot';

describe('ScatterPlot', () => {
  it('shows an empty state for no points, never a broken chart', () => {
    render(<ScatterPlot points={[]} xLabel="Tentativas" yLabel="Acerto (%)" ariaLabel="teste" />);
    expect(screen.getByText('N=0 — sem dados.')).toBeInTheDocument();
  });

  it('renders one point per datum, accessible via role=img', () => {
    render(
      <ScatterPlot
        points={[
          { x: 2, y: 50 },
          { x: 1, y: 100 },
        ]}
        xLabel="Tentativas"
        yLabel="Acerto (%)"
        ariaLabel="Tentativas × acerto por aluno"
      />,
    );
    const chart = screen.getByRole('img', { name: 'Tentativas × acerto por aluno' });
    expect(chart.querySelectorAll('circle')).toHaveLength(2);
  });
});
