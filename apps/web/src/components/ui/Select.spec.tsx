import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

const options = [
  { value: 'enrolledAt', label: 'Data de matrícula' },
  { value: 'name', label: 'Nome' },
];

describe('Select', () => {
  it('shows a visible text label, not just a placeholder', () => {
    render(
      <Select id="sort" label="Ordenar por" options={options} value="enrolledAt" onValueChange={vi.fn()} />,
    );
    expect(screen.getByText('Ordenar por')).toBeInTheDocument();
  });

  it('shows the current value in the trigger', () => {
    render(
      <Select id="sort" label="Ordenar por" options={options} value="enrolledAt" onValueChange={vi.fn()} />,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('Data de matrícula');
  });

  it('calls onValueChange when a new option is picked', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select id="sort" label="Ordenar por" options={options} value="enrolledAt" onValueChange={onValueChange} />,
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Nome' }));
    expect(onValueChange).toHaveBeenCalledWith('name');
  });
});
