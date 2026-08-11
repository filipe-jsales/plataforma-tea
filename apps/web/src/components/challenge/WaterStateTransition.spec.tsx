import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSensoryProfileStore } from '../../stores/useSensoryProfileStore';
import { WaterStateTransition } from './WaterStateTransition';

function stubAudioContext() {
  const oscillator = { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  const instance = {
    createOscillator: () => oscillator,
    createGain: () => gain,
    currentTime: 0,
    destination: {},
  };
  const ctor = vi.fn(function AudioContextMock() {
    return instance;
  });
  vi.stubGlobal('AudioContext', ctor);
  return { ctor, oscillator };
}

describe('WaterStateTransition', () => {
  beforeEach(() => {
    useSensoryProfileStore.setState({ soundEnabled: false });
    vi.unstubAllGlobals();
  });

  it('regra não-negociável 9 — always shows icon and text together for the current state, never color-only', () => {
    render(<WaterStateTransition state="LIQUID" />);

    expect(screen.getByText('💧')).toBeInTheDocument();
    expect(screen.getByText('Líquido')).toBeInTheDocument();
  });

  it('swaps icon+text when the state prop changes', () => {
    const { rerender } = render(<WaterStateTransition state="LIQUID" />);
    rerender(<WaterStateTransition state="GAS" />);

    expect(screen.getByText('☁️')).toBeInTheDocument();
    expect(screen.getByText('Gasoso')).toBeInTheDocument();
    expect(screen.queryByText('💧')).not.toBeInTheDocument();
  });

  it('3.16 AC2 — never plays a sound when the sensory profile has sound disabled (default)', () => {
    const { ctor } = stubAudioContext();

    const { rerender } = render(<WaterStateTransition state="LIQUID" />);
    rerender(<WaterStateTransition state="GAS" />);

    expect(ctor).not.toHaveBeenCalled();
  });

  it('never plays a sound on the initial render, even with sound enabled (not a "transition" yet)', () => {
    useSensoryProfileStore.setState({ soundEnabled: true });
    const { ctor } = stubAudioContext();

    render(<WaterStateTransition state="LIQUID" />);

    expect(ctor).not.toHaveBeenCalled();
  });

  it('plays a synthesized chime on a real state change when sound is enabled', () => {
    useSensoryProfileStore.setState({ soundEnabled: true });
    const { ctor, oscillator } = stubAudioContext();

    const { rerender } = render(<WaterStateTransition state="LIQUID" />);
    rerender(<WaterStateTransition state="GAS" />);

    expect(ctor).toHaveBeenCalledTimes(1);
    expect(oscillator.start).toHaveBeenCalledTimes(1);
  });
});
