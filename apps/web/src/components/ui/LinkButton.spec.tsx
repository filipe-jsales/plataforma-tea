import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LinkButton } from './LinkButton';
import { Button } from './Button';

describe('LinkButton', () => {
  it('renders an <a> that navigates, with the same classes as Button', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/home" icon="←">
          Voltar
        </LinkButton>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Voltar' });
    expect(link).toHaveAttribute('href', '/home');
    expect(link).toHaveClass('ui-button', 'ui-button--primary');
  });

  it('shares its exact geometry classes with Button — same shape, only the element differs', () => {
    render(
      <MemoryRouter>
        <>
          <Button variant="ghost">Entrar</Button>
          <LinkButton to="/home" variant="ghost">
            Voltar
          </LinkButton>
        </>
      </MemoryRouter>,
    );
    const button = screen.getByRole('button', { name: 'Entrar' });
    const link = screen.getByRole('link', { name: 'Voltar' });
    expect(button.className).toBe(link.className);
  });

  it('never renders the icon as the only accessible content — text is always present', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/home" icon="←">
          Voltar
        </LinkButton>
      </MemoryRouter>,
    );
    expect(screen.getByText('Voltar')).toBeInTheDocument();
  });
});
