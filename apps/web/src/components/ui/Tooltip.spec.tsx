import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tooltip } from './Tooltip';
import { Button } from './Button';

describe('Tooltip', () => {
  it('never supplies the trigger name - the trigger keeps its own accessible name', () => {
    render(
      <Tooltip content="Executa o programa montado">
        <Button>Executar</Button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Executar' })).toBeInTheDocument();
  });

  it('shows the supplemental content on hover', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Executa o programa montado">
        <Button>Executar</Button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'Executar' }));
    expect(await screen.findByText('Executa o programa montado')).toBeInTheDocument();
  });
});
