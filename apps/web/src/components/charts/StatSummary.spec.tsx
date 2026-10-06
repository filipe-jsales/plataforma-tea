import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SampleSizeNote, StatList } from './StatSummary';

describe('StatList', () => {
  it('shows "N=0 - sem dados" instead of nulls/NaN when the distribution is empty', () => {
    render(
      <StatList stats={{ n: 0, mean: null, median: null, stdDev: null, min: null, max: null, q1: null, q3: null }} />,
    );
    expect(screen.getByText('N=0 - sem dados.')).toBeInTheDocument();
  });

  it('renders every field with the given unit suffix', () => {
    render(
      <StatList
        stats={{ n: 5, mean: 5.5, median: 5.5, stdDev: 3.03, min: 1, max: 10, q1: 3.25, q3: 7.75 }}
        unit=" tentativas"
      />,
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getAllByText('5.5 tentativas')).toHaveLength(2); // média e mediana coincidem neste dataset
  });

  it('shows a distinct "N<2" marker for stdDev instead of a misleading 0', () => {
    render(<StatList stats={{ n: 1, mean: 7, median: 7, stdDev: null, min: 7, max: 7, q1: 7, q3: 7 }} />);
    expect(screen.getByText('- (N<2)')).toBeInTheDocument();
  });
});

describe('SampleSizeNote', () => {
  it('renders nothing when n meets or exceeds the threshold', () => {
    const { container } = render(<SampleSizeNote n={5} threshold={5} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for n=0 (already communicated as "sem dados" elsewhere)', () => {
    const { container } = render(<SampleSizeNote n={0} threshold={5} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an explicit warning with both N and the configured threshold when below it', () => {
    render(<SampleSizeNote n={3} threshold={5} />);
    expect(screen.getByText(/N=3/)).toBeInTheDocument();
    expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
  });
});
