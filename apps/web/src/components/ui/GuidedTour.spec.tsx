import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GuidedTour, type GuidedTourStep } from './GuidedTour';

// jsdom nunca calcula layout de verdade — `getBoundingClientRect` de
// qualquer elemento devolve um retângulo zerado. Isso é irrelevante pro que
// este arquivo testa (navegação entre passos, fechamento, rótulos
// acessíveis): o CÁLCULO de posição em si tem cobertura própria em
// lib/tourPositioning.spec.ts, com retângulos inventados.
const steps: GuidedTourStep[] = [
  { targetId: 'field-a', title: 'Passo 1', description: 'Descrição do passo 1.' },
  { targetId: 'field-b', title: 'Passo 2', description: 'Descrição do passo 2.' },
  { targetId: 'field-c', title: 'Passo 3', description: 'Descrição do passo 3.' },
];

function renderWithTargets(children: React.ReactElement) {
  return render(
    <>
      <div id="field-a">Campo A</div>
      <div id="field-b">Campo B</div>
      <div id="field-c">Campo C</div>
      {children}
    </>,
  );
}

describe('GuidedTour', () => {
  it('renders nothing when closed', () => {
    renderWithTargets(<GuidedTour steps={steps} open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the first step, showing its title/description and a step counter', () => {
    renderWithTargets(<GuidedTour steps={steps} open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Passo 1' })).toBeInTheDocument();
    expect(screen.getByText('Descrição do passo 1.')).toBeInTheDocument();
    expect(screen.getByText('Passo 1 de 3')).toBeInTheDocument();
  });

  it('never shows "← Voltar" on the first step (nothing to go back to)', () => {
    renderWithTargets(<GuidedTour steps={steps} open onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /voltar/i })).not.toBeInTheDocument();
  });

  it('advances to the next step, then back, keeping the same step count', async () => {
    renderWithTargets(<GuidedTour steps={steps} open onOpenChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByRole('dialog', { name: 'Passo 2' })).toBeInTheDocument();
    expect(screen.getByText('Passo 2 de 3')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /voltar/i }));
    expect(screen.getByRole('dialog', { name: 'Passo 1' })).toBeInTheDocument();
  });

  it('shows "Concluir" instead of "Próximo" only on the last step, and it closes the tour', async () => {
    const onOpenChange = vi.fn();
    renderWithTargets(<GuidedTour steps={steps} open onOpenChange={onOpenChange} />);

    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));

    expect(screen.getByText('Passo 3 de 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /próximo/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /concluir/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('"Pular tutorial" closes immediately, regardless of the current step', async () => {
    const onOpenChange = vi.fn();
    renderWithTargets(<GuidedTour steps={steps} open onOpenChange={onOpenChange} />);

    await userEvent.click(screen.getByRole('button', { name: /pular tutorial/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reopening always restarts from the first step, never resuming a previous session mid-way', async () => {
    const { rerender } = renderWithTargets(<GuidedTour steps={steps} open onOpenChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByRole('dialog', { name: 'Passo 2' })).toBeInTheDocument();

    rerender(
      <>
        <div id="field-a">Campo A</div>
        <div id="field-b">Campo B</div>
        <div id="field-c">Campo C</div>
        <GuidedTour steps={steps} open={false} onOpenChange={vi.fn()} />
      </>,
    );
    rerender(
      <>
        <div id="field-a">Campo A</div>
        <div id="field-b">Campo B</div>
        <div id="field-c">Campo C</div>
        <GuidedTour steps={steps} open onOpenChange={vi.fn()} />
      </>,
    );

    expect(screen.getByRole('dialog', { name: 'Passo 1' })).toBeInTheDocument();
  });

  it('renders nothing (no crash) for an empty step list', () => {
    renderWithTargets(<GuidedTour steps={[]} open onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
