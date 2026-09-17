import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders as an alert with icon + text, never text alone (regra não-negociável 4)', () => {
    render(
      <Toast kind="retry" onDismiss={vi.fn()}>
        Alguns campos precisam de atenção antes de salvar.
      </Toast>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Alguns campos precisam de atenção antes de salvar.');
    expect(alert.querySelector('.ui-feedback__icon')).not.toBeNull();
  });

  it('dismisses when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    // Sem auto-dismiss aqui — só testando o clique, nunca a corrida contra
    // o timer (o timer em si tem teste próprio abaixo, com fake timers).
    render(
      <Toast kind="retry" onDismiss={onDismiss} autoDismissMs={0}>
        Aviso
      </Toast>,
    );

    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after the configured delay', () => {
    vi.useFakeTimers();
    try {
      const onDismiss = vi.fn();
      render(
        <Toast kind="retry" onDismiss={onDismiss} autoDismissMs={5000}>
          Aviso
        </Toast>,
      );

      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(5000);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('never auto-dismisses when autoDismissMs is 0', () => {
    vi.useFakeTimers();
    try {
      const onDismiss = vi.fn();
      render(
        <Toast kind="retry" onDismiss={onDismiss} autoDismissMs={0}>
          Aviso
        </Toast>,
      );

      vi.advanceTimersByTime(60000);
      expect(onDismiss).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
