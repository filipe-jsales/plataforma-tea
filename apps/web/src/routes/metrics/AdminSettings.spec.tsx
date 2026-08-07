import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { AdminSettings } from './AdminSettings';

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPatch = vi.mocked(apiClient.patch);

beforeEach(() => {
  mockedGet.mockReset();
  mockedPatch.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminSettings />
    </MemoryRouter>,
  );
}

describe('AdminSettings', () => {
  it('pre-fills the input with the current threshold from the API', async () => {
    mockedGet.mockResolvedValueOnce({ id: 's1', minSampleSizeThreshold: 5, updatedAt: '2026-01-01' });

    renderPage();

    expect(await screen.findByDisplayValue('5')).toBeInTheDocument();
  });

  it('submits the new value via PATCH and shows a confirmation, never resetting other data', async () => {
    mockedGet.mockResolvedValueOnce({ id: 's1', minSampleSizeThreshold: 5, updatedAt: '2026-01-01' });
    mockedPatch.mockResolvedValueOnce({ id: 's1', minSampleSizeThreshold: 8, updatedAt: '2026-01-02' });

    renderPage();

    const input = await screen.findByDisplayValue('5');
    await userEvent.clear(input);
    await userEvent.type(input, '8');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    expect(mockedPatch).toHaveBeenCalledWith('/admin/settings', { minSampleSizeThreshold: 8 });
    expect(await screen.findByText('Configuração salva.')).toBeInTheDocument();
  });

  it('rejects a non-positive value client-side, never calling PATCH', async () => {
    mockedGet.mockResolvedValueOnce({ id: 's1', minSampleSizeThreshold: 5, updatedAt: '2026-01-01' });

    renderPage();

    const input = await screen.findByDisplayValue('5');
    await userEvent.clear(input);
    await userEvent.type(input, '0');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('Informe um número inteiro positivo.')).toBeInTheDocument();
    expect(mockedPatch).not.toHaveBeenCalled();
  });

  it('3.11: "← Voltar" is a real link styled like a button, never a bare text link', async () => {
    mockedGet.mockResolvedValueOnce({ id: 's1', minSampleSizeThreshold: 5, updatedAt: '2026-01-01' });

    renderPage();

    const back = await screen.findByRole('link', { name: /voltar/i });
    expect(back).toHaveAttribute('href', '/home');
    expect(back).toHaveClass('ui-button');
  });
});
