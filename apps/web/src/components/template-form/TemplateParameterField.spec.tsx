import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TemplateParameterDefinition } from '../../lib/challengeTemplateTypes';
import { TemplateParameterField } from './TemplateParameterField';

const sidesDefinition: TemplateParameterDefinition = {
  key: 'sides',
  label: 'Número de lados',
  icon: '🔺',
  type: 'integer',
  min: 3,
  max: 12,
  defaultValue: 4,
  visualPreview: 'polygonSides',
  helpText: 'Quantos lados a figura vai ter.',
};

const toleranceDefinition: TemplateParameterDefinition = {
  key: 'snapTolerancePercent',
  label: 'Tolerância de encaixe',
  icon: '🧲',
  type: 'percentage',
  min: 10,
  max: 100,
  defaultValue: 60,
  visualPreview: 'toleranceGauge',
};

const blockSizeDefinition: TemplateParameterDefinition = {
  key: 'blockSize',
  label: 'Tamanho dos blocos',
  icon: '🔍',
  type: 'select',
  defaultValue: 'medium',
  visualPreview: 'none',
  options: [
    { value: 'small', label: 'Pequeno' },
    { value: 'medium', label: 'Médio' },
    { value: 'large', label: 'Grande' },
  ],
};

const blocksDefinition: TemplateParameterDefinition = {
  key: 'enabledBlockTypes',
  label: 'Blocos disponíveis',
  icon: '🧩',
  type: 'blockSelection',
  defaultValue: ['move_forward'],
  visualPreview: 'none',
  options: [
    { value: 'move_forward', label: 'Mover para frente' },
    { value: 'turn', label: 'Girar' },
  ],
};

describe('TemplateParameterField', () => {
  it('AC2 — always shows icon and text together for the label, never icon-only', () => {
    render(<TemplateParameterField definition={sidesDefinition} value={4} onChange={vi.fn()} />);

    expect(screen.getByText('🔺')).toBeInTheDocument();
    expect(screen.getByText('Número de lados')).toBeInTheDocument();
  });

  it('AC2 — renders the inline visual example matching the current value', () => {
    // A prévia é decorativa (aria-hidden no wrapper, redundante com o valor
    // já anunciado pelo input rotulado) — inspeciona o DOM diretamente em
    // vez de getByRole, que corretamente ignora nós aria-hidden.
    const { container } = render(<TemplateParameterField definition={sidesDefinition} value={6} onChange={vi.fn()} />);

    const svg = container.querySelector('svg.template-preview-icon');
    expect(svg).toHaveAttribute('aria-label', 'Prévia: figura com 6 lados');
  });

  it('calls onChange with a coerced number when an integer field changes', () => {
    const onChange = vi.fn();
    render(<TemplateParameterField definition={sidesDefinition} value={4} onChange={onChange} />);

    const input = screen.getByLabelText('Número de lados');
    fireEvent.change(input, { target: { value: '6' } });

    expect(onChange).toHaveBeenLastCalledWith(6);
  });

  it('renders a percentage field as a range slider with a live numeric readout', () => {
    render(<TemplateParameterField definition={toleranceDefinition} value={60} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Tolerância de encaixe')).toHaveAttribute('type', 'range');
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('regra 9 — renders a select field as 3 named options, never a raw scale number', () => {
    render(<TemplateParameterField definition={blockSizeDefinition} value="medium" onChange={vi.fn()} />);

    expect(screen.getByRole('radiogroup', { name: 'Tamanho dos blocos' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Pequeno' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Médio' })).toHaveAttribute('data-state', 'on');
    expect(screen.getByRole('radio', { name: 'Grande' })).toBeInTheDocument();
    expect(screen.queryByText(/1[.,]3|1[.,]6/)).not.toBeInTheDocument();
  });

  it('calls onChange with the option value when the professor picks a different block size', async () => {
    const onChange = vi.fn();
    render(<TemplateParameterField definition={blockSizeDefinition} value="medium" onChange={onChange} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Grande' }));

    expect(onChange).toHaveBeenCalledWith('large');
  });

  it('renders one toggle per candidate block, reflecting which ones are already selected', () => {
    render(<TemplateParameterField definition={blocksDefinition} value={['move_forward']} onChange={vi.fn()} />);

    expect(screen.getByRole('switch', { name: /mover para frente/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /girar/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('toggling a block on adds it to the array without dropping the others already selected', async () => {
    const onChange = vi.fn();
    render(<TemplateParameterField definition={blocksDefinition} value={['move_forward']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('switch', { name: /girar/i }));

    expect(onChange).toHaveBeenCalledWith(['move_forward', 'turn']);
  });

  it('shows a non-technical message when no candidate block has been introduced yet', () => {
    render(
      <TemplateParameterField
        definition={{ ...blocksDefinition, options: [] }}
        value={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/nenhum bloco disponível/i)).toBeInTheDocument();
  });

  it('AC3 — renders the pedagogical error message inline under the field when present', () => {
    render(
      <TemplateParameterField
        definition={sidesDefinition}
        value={2}
        error="Escolha um número de lados entre 3 e 12."
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Escolha um número de lados entre 3 e 12.')).toBeInTheDocument();
  });

  it('never renders an error when the field is valid', () => {
    render(<TemplateParameterField definition={sidesDefinition} value={4} onChange={vi.fn()} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
