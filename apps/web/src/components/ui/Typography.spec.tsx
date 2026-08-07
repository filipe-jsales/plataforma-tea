import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Heading } from './Heading';
import { Text } from './Text';

describe('Heading', () => {
  it('renders the matching semantic tag for each level', () => {
    const { rerender } = render(<Heading level={1}>Título</Heading>);
    expect(screen.getByRole('heading', { level: 1, name: 'Título' })).toBeInTheDocument();

    rerender(<Heading level={2}>Título</Heading>);
    expect(screen.getByRole('heading', { level: 2, name: 'Título' })).toBeInTheDocument();

    rerender(<Heading level={3}>Título</Heading>);
    expect(screen.getByRole('heading', { level: 3, name: 'Título' })).toBeInTheDocument();
  });
});

describe('Text', () => {
  it('renders as a <p> by default', () => {
    render(<Text>Alguma instrução</Text>);
    const node = screen.getByText('Alguma instrução');
    expect(node.tagName).toBe('P');
  });

  it('renders as a <span> when as="span" is passed', () => {
    render(<Text as="span">Rótulo inline</Text>);
    expect(screen.getByText('Rótulo inline').tagName).toBe('SPAN');
  });

  it('applies the tone class without changing the text content', () => {
    render(<Text tone="warning">Quase lá</Text>);
    expect(screen.getByText('Quase lá')).toHaveClass('ui-text--warning');
  });
});
