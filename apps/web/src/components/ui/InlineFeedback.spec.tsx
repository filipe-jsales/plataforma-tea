import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InlineFeedback } from './InlineFeedback';

describe('InlineFeedback', () => {
  it('always renders an icon alongside the text, never text alone', () => {
    render(<InlineFeedback kind="retry">Quase lá — quer tentar de novo?</InlineFeedback>);
    const message = screen.getByText('Quase lá — quer tentar de novo?');
    const container = message.closest('.ui-feedback');
    expect(container?.querySelector('.ui-feedback__icon')).not.toBeNull();
  });

  it('never uses punitive words like "errado"/"falhou" as default copy — that is the caller\'s responsibility, but the default retry icon is a reversible cue (🔁), never an X', () => {
    render(<InlineFeedback kind="retry">Quase lá</InlineFeedback>);
    expect(screen.getByText('🔁')).toBeInTheDocument();
  });

  it('lets the caller override the icon while keeping the text', () => {
    render(
      <InlineFeedback kind="success" icon="🎉">
        Você concluiu!
      </InlineFeedback>,
    );
    expect(screen.getByText('🎉')).toBeInTheDocument();
    expect(screen.getByText('Você concluiu!')).toBeInTheDocument();
  });

  it('marks retry feedback with role="status" so screen readers announce it without a page reload', () => {
    render(<InlineFeedback kind="retry">Quase lá</InlineFeedback>);
    expect(screen.getByRole('status')).toHaveTextContent('Quase lá');
  });
});
