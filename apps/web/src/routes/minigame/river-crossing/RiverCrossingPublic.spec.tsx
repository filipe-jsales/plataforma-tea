import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import { apiClient } from '../../../lib/apiClient';
import { logEvent } from '../../../lib/logEvent';
import { useAuthStore } from '../../../stores/useAuthStore';

vi.mock('../../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../../lib/logEvent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/logEvent')>()),
  logEvent: vi.fn(),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('Travessia do Rio - acesso público', () => {
  beforeEach(() => {
    vi.mocked(logEvent).mockClear();
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue(undefined as never);
    useAuthStore.setState({ token: null, user: null });
  });

  it('abre sem login, mostra as regras e não tem o botão Voltar nem o layout do app', async () => {
    renderAt('/jogo/travessia');
    expect(await screen.findByRole('region', { name: 'Regras do jogo' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voltar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Menu/ })).not.toBeInTheDocument();
  });

  it('dá para jogar sem sessão e nada é enviado ao backend', async () => {
    const user = userEvent.setup();
    renderAt('/jogo/travessia');
    await user.click(await screen.findByRole('button', { name: 'Começar rodada 2' }));
    expect(screen.queryByRole('link', { name: 'Voltar' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Alface, peso/ }));
    await user.click(screen.getByRole('button', { name: /^Galinha, peso/ }));
    await user.click(screen.getByRole('button', { name: 'Atravessar para a margem direita' }));
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Margem Direita' }).querySelector('[aria-label^="Galinha"]')).not.toBeNull(),
    );
    await user.click(screen.getByRole('button', { name: 'Virar dica 1' }));

    expect(logEvent).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('a rota de dentro da plataforma continua exigindo login', async () => {
    renderAt('/minigame/river-crossing');
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Regras do jogo' })).not.toBeInTheDocument());
  });
});
