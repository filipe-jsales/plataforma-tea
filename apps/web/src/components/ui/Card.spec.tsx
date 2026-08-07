import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectableCard } from './Card';

describe('SelectableCard', () => {
  it('exposes the button role so it behaves like a native clickable control', () => {
    render(
      <SelectableCard icon="📐" onSelect={vi.fn()}>
        Geometria
      </SelectableCard>,
    );
    expect(screen.getByRole('button', { name: 'Geometria' })).toBeInTheDocument();
  });

  it('calls onSelect on click', async () => {
    const onSelect = vi.fn();
    render(<SelectableCard onSelect={onSelect}>Geometria</SelectableCard>);
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('is keyboard-operable via Enter, same as a native button', async () => {
    const onSelect = vi.fn();
    render(<SelectableCard onSelect={onSelect}>Geometria</SelectableCard>);
    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows selection as visible text, never only a border/color change', () => {
    render(
      <SelectableCard selected onSelect={vi.fn()}>
        Geometria
      </SelectableCard>,
    );
    expect(screen.getByText('✓ Selecionado')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not call onSelect when disabled', async () => {
    const onSelect = vi.fn();
    render(
      <SelectableCard disabled onSelect={onSelect}>
        Geometria
      </SelectableCard>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
