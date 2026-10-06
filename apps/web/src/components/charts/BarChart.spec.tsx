import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarChart } from './BarChart';

describe('BarChart', () => {
  it('shows an empty state when there is no data, never a broken/NaN chart', () => {
    render(<BarChart data={[]} ariaLabel="teste" />);
    expect(screen.getByText('N=0 - sem dados.')).toBeInTheDocument();
  });

  it('shows an empty state when every bucket has count 0', () => {
    render(
      <BarChart
        data={[
          { label: 'A', count: 0 },
          { label: 'B', count: 0 },
        ]}
        ariaLabel="teste"
      />,
    );
    expect(screen.getByText('N=0 - sem dados.')).toBeInTheDocument();
  });

  it('renders the accessible chart with one label per bar', () => {
    render(
      <BarChart
        data={[
          { label: 'TIMES', count: 3 },
          { label: 'ANGLE', count: 1 },
        ]}
        ariaLabel="Campo mais alterado"
      />,
    );
    expect(screen.getByRole('img', { name: 'Campo mais alterado' })).toBeInTheDocument();
    expect(screen.getByText('TIMES')).toBeInTheDocument();
    expect(screen.getByText('ANGLE')).toBeInTheDocument();
  });
});
