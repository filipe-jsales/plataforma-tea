import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToggleSwitch } from './ToggleSwitch';

describe('ToggleSwitch', () => {
  it('exposes the switch role with aria-checked, never a bare div', () => {
    render(
      <ToggleSwitch id="sound" icon="🔊" label="Quer som?" checked={false} onCheckedChange={vi.fn()} />,
    );
    expect(screen.getByRole('switch', { name: 'Quer som?' })).toHaveAttribute('aria-checked', 'false');
  });

  it('shows the state as visible text, never only the switch color/position', () => {
    const { rerender } = render(
      <ToggleSwitch id="sound" label="Quer som?" checked={false} onCheckedChange={vi.fn()} />,
    );
    expect(screen.getByText('Desligado')).toBeInTheDocument();

    rerender(<ToggleSwitch id="sound" label="Quer som?" checked onCheckedChange={vi.fn()} />);
    expect(screen.getByText('Ligado')).toBeInTheDocument();
  });

  it('calls onCheckedChange when the label row is clicked', async () => {
    const onCheckedChange = vi.fn();
    render(
      <ToggleSwitch id="sound" label="Quer som?" checked={false} onCheckedChange={onCheckedChange} />,
    );
    await userEvent.click(screen.getByText('Quer som?'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('is keyboard-operable (space toggles a focused switch)', async () => {
    const onCheckedChange = vi.fn();
    render(
      <ToggleSwitch id="sound" label="Quer som?" checked={false} onCheckedChange={onCheckedChange} />,
    );
    const control = screen.getByRole('switch');
    control.focus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
