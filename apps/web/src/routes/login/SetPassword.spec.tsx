import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { SetPassword } from './SetPassword';

vi.mock('../../lib/apiClient', () => ({ apiClient: { post: vi.fn() } }));

const mockedPost = vi.mocked(apiClient.post);
const TOKEN = '8accbdd3-52f2-4a94-8c64-b8fd757323dd';

function renderPage(url = `/set-password?token=${TOKEN}`) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <SetPassword />
    </MemoryRouter>,
  );
}

describe('SetPassword', () => {
  beforeEach(() => mockedPost.mockReset());

  it('explains the link is incomplete when there is no token', () => {
    renderPage('/set-password');
    expect(screen.getByText(/link está incompleto/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nova senha/i)).not.toBeInTheDocument();
  });

  it('blocks a password that is too short or does not match, without calling the API', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'curta');
    await userEvent.type(screen.getByLabelText(/repita a senha/i), 'curta');
    await userEvent.click(screen.getByRole('button', { name: /salvar senha/i }));
    expect(screen.getByText(/pelo menos 8 caracteres/i)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/nova senha/i));
    await userEvent.clear(screen.getByLabelText(/repita a senha/i));
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'senha-longa-1');
    await userEvent.type(screen.getByLabelText(/repita a senha/i), 'senha-longa-2');
    await userEvent.click(screen.getByRole('button', { name: /salvar senha/i }));
    expect(screen.getByText(/não são iguais/i)).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('sends the token and password, then shows the success state', async () => {
    mockedPost.mockResolvedValueOnce({ ok: true });
    renderPage();
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'senha-longa-1');
    await userEvent.type(screen.getByLabelText(/repita a senha/i), 'senha-longa-1');
    await userEvent.click(screen.getByRole('button', { name: /salvar senha/i }));

    expect(mockedPost).toHaveBeenCalledWith('/auth/set-password', { token: TOKEN, password: 'senha-longa-1' });
    expect(await screen.findByRole('heading', { name: /senha definida/i })).toBeInTheDocument();
  });

  it('shows a friendly message when the link was rejected', async () => {
    mockedPost.mockRejectedValueOnce(new Error('invalid'));
    renderPage();
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'senha-longa-1');
    await userEvent.type(screen.getByLabelText(/repita a senha/i), 'senha-longa-1');
    await userEvent.click(screen.getByRole('button', { name: /salvar senha/i }));
    expect(await screen.findByText(/não é mais válido/i)).toBeInTheDocument();
  });
});
