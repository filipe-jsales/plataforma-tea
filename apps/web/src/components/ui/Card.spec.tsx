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

  it('renders meta as a secondary line, distinct from the title (3.11 hierarchy)', () => {
    render(
      <SelectableCard align="start" meta="Código: AZUL-1 · 12 alunos ativos" onSelect={vi.fn()}>
        Turma Demo
      </SelectableCard>,
    );
    const title = screen.getByText('Turma Demo');
    const meta = screen.getByText('Código: AZUL-1 · 12 alunos ativos');
    expect(title.className).toBe('ui-card__label');
    expect(meta.className).toBe('ui-card__meta');
    expect(screen.getByRole('button')).toContainElement(title);
    expect(screen.getByRole('button')).toContainElement(meta);
  });

  it('defaults to the centered aluno layout when align is not passed', () => {
    render(<SelectableCard onSelect={vi.fn()}>Geometria</SelectableCard>);
    expect(screen.getByRole('button')).toHaveClass('ui-card--align-center');
  });
});
