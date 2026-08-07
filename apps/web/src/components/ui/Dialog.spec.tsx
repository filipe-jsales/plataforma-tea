import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} onOpenChange={vi.fn()} title="Confirmar">
        Conteúdo
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the title and content when open', () => {
    render(
      <Dialog open onOpenChange={vi.fn()} title="Confirmar" description="Tem certeza?">
        Conteúdo do diálogo
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toBeInTheDocument();
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do diálogo')).toBeInTheDocument();
  });

  it('the close control has a visible text label, never an icon-only ✕', () => {
    render(
      <Dialog open onOpenChange={vi.fn()} title="Confirmar">
        Conteúdo
      </Dialog>,
    );
    expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when the close button is clicked', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Confirmar">
        Conteúdo
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
