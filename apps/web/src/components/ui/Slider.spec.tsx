import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider';

describe('Slider', () => {
  it('labels the thumb for assistive tech', () => {
    render(<Slider min={-20} max={150} value={20} onValueChange={vi.fn()} ariaLabel="Temperatura" />);

    expect(screen.getByRole('slider', { name: 'Temperatura' })).toBeInTheDocument();
  });

  it('shows the current value as visible text, never only the thumb position', () => {
    render(<Slider min={-20} max={150} value={42} onValueChange={vi.fn()} ariaLabel="Temperatura" unit="°C" />);

    expect(screen.getByText('42°C')).toBeInTheDocument();
  });

  it('calls onValueChange with a plain number when the thumb moves via keyboard', async () => {
    const onValueChange = vi.fn();
    render(<Slider min={0} max={100} step={1} value={20} onValueChange={onValueChange} ariaLabel="Temperatura" />);

    const thumb = screen.getByRole('slider', { name: 'Temperatura' });
    thumb.focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(onValueChange).toHaveBeenCalledWith(21);
  });

  it('calls onValueCommit only once interaction settles, not on every onValueChange tick', async () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(
      <Slider
        min={0}
        max={100}
        step={1}
        value={20}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
        ariaLabel="Temperatura"
      />,
    );

    const thumb = screen.getByRole('slider', { name: 'Temperatura' });
    thumb.focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(onValueChange).toHaveBeenCalledWith(21);
    expect(onValueCommit).toHaveBeenCalledWith(21);
  });

  it('respects step when moving via keyboard', async () => {
    const onValueChange = vi.fn();
    render(<Slider min={0} max={200} step={10} value={100} onValueChange={onValueChange} ariaLabel="Temperatura" />);

    const thumb = screen.getByRole('slider', { name: 'Temperatura' });
    thumb.focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(onValueChange).toHaveBeenCalledWith(110);
  });
});
