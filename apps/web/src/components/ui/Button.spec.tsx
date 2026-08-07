import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders the text label even when an icon is given (never icon-only)', () => {
    render(<Button icon="▶️">Continuar</Button>);
    const button = screen.getByRole('button', { name: /continuar/i });
    expect(button).toBeInTheDocument();
    // O ícone é decorativo (aria-hidden) — o nome acessível vem só do texto.
    expect(button.querySelector('.ui-button__icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Confirmar</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('defaults to type="button" so it never accidentally submits a form', () => {
    render(<Button>Ação</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('applies the requested variant class', () => {
    render(<Button variant="ghost">Cancelar</Button>);
    expect(screen.getByRole('button')).toHaveClass('ui-button--ghost');
  });

  it('is disabled when disabled is passed, never just visually dimmed via a click handler check', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Enviando…
      </Button>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
