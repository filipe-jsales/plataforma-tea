import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiError } from '../../lib/apiClient';
import { AdminExport } from './AdminExport';

vi.mock('../../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../lib/apiClient')>('../../lib/apiClient');
  return {
    ...actual,
    apiClient: { get: vi.fn(), getRaw: vi.fn(), post: vi.fn(), patch: vi.fn() },
  };
});

const mockedGet = vi.mocked(apiClient.get);
const mockedGetRaw = vi.mocked(apiClient.getRaw);

const schools = [{ id: 's1', name: 'Escola Azul' }];
const challenges = [{ id: 'c1', title: 'Monte o quadrado', topicName: 'Ângulos e Formas' }];

beforeEach(() => {
  mockedGet.mockReset();
  mockedGetRaw.mockReset();
  mockedGet.mockImplementation((path: string) => {
    if (path === '/metrics/admin/schools') return Promise.resolve(schools as any);
    if (path === '/metrics/admin/challenges') return Promise.resolve(challenges as any);
    return Promise.resolve(undefined as any);
  });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminExport />
    </MemoryRouter>,
  );
}

// Select (Radix) só mostra a opção carregada quando o dropdown está aberto
// — o gatilho continua com o mesmo texto placeholder ("Todas as escolas")
// antes e depois do fetch resolver, então não dá pra esperar por texto
// visível. Espera as duas chamadas iniciais (escolas + desafios)
// resolverem antes de interagir.
async function waitForOptionsLoaded() {
  await waitFor(() => {
    expect(mockedGet).toHaveBeenCalledWith('/metrics/admin/schools');
    expect(mockedGet).toHaveBeenCalledWith('/metrics/admin/challenges');
  });
}

describe('AdminExport', () => {
  it('shows a validation error and never calls the API when no filter is chosen', async () => {
    renderPage();
    await waitForOptionsLoaded();

    await userEvent.click(screen.getByRole('button', { name: /baixar exportação/i }));

    expect(
      await screen.findByText('Escolha ao menos um filtro: escola, desafio ou período.'),
    ).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalledWith(expect.stringContaining('/metrics/admin/export'));
  });

  it('rejects an incomplete period (only "from" filled) client-side, before hitting the API', async () => {
    renderPage();
    await waitForOptionsLoaded();

    const [fromInput] = screen.getAllByDisplayValue('');
    await userEvent.type(fromInput, '2026-01-01');
    await userEvent.click(screen.getByRole('button', { name: /baixar exportação/i }));

    expect(
      await screen.findByText(/Informe as duas datas do período/),
    ).toBeInTheDocument();
  });

  it('requests a JSON export scoped to the selected challenge, downloads it, and shows a row count', async () => {
    mockedGet.mockImplementation((path: string) => {
      if (path === '/metrics/admin/schools') return Promise.resolve(schools as any);
      if (path === '/metrics/admin/challenges') return Promise.resolve(challenges as any);
      if (path.startsWith('/metrics/admin/export')) {
        return Promise.resolve({
          rows: [{ id: 'e1' }, { id: 'e2' }],
          page: 1,
          pageSize: 500,
          hasMore: false,
        } as any);
      }
      return Promise.resolve(undefined as any);
    });

    renderPage();
    await waitForOptionsLoaded();

    await userEvent.click(screen.getByLabelText('Desafio'));
    await userEvent.click(await screen.findByRole('option', { name: /Monte o quadrado/ }));
    await userEvent.click(screen.getByRole('button', { name: /baixar exportação/i }));

    expect(
      await screen.findByText('2 linha(s) exportada(s) — arquivo JSON baixado.'),
    ).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith(
      expect.stringContaining('/metrics/admin/export?challengeId=c1&format=json'),
    );
  });

  it('warns when the export has more rows beyond this page (hasMore)', async () => {
    mockedGet.mockImplementation((path: string) => {
      if (path === '/metrics/admin/schools') return Promise.resolve(schools as any);
      if (path === '/metrics/admin/challenges') return Promise.resolve(challenges as any);
      if (path.startsWith('/metrics/admin/export')) {
        return Promise.resolve({ rows: [{ id: 'e1' }], page: 1, pageSize: 500, hasMore: true } as any);
      }
      return Promise.resolve(undefined as any);
    });

    renderPage();
    await waitForOptionsLoaded();
    await userEvent.click(screen.getByLabelText('Desafio'));
    await userEvent.click(await screen.findByRole('option', { name: /Monte o quadrado/ }));
    await userEvent.click(screen.getByRole('button', { name: /baixar exportação/i }));

    expect(await screen.findByText(/Existem mais linhas além desta página/)).toBeInTheDocument();
  });

  it('requests a CSV export via getRaw (not get) and downloads the raw text as-is', async () => {
    mockedGetRaw.mockResolvedValue({
      text: 'id,type\r\ne1,program_executed\r\ne2,block_dragged',
      contentType: 'text/csv',
    });

    renderPage();
    await waitForOptionsLoaded();

    await userEvent.click(screen.getByLabelText('Desafio'));
    await userEvent.click(await screen.findByRole('option', { name: /Monte o quadrado/ }));
    await userEvent.click(screen.getByLabelText('Formato do arquivo'));
    await userEvent.click(await screen.findByRole('option', { name: 'CSV (planilha)' }));
    await userEvent.click(screen.getByRole('button', { name: /baixar exportação/i }));

    expect(mockedGetRaw).toHaveBeenCalledWith(
      expect.stringContaining('/metrics/admin/export?challengeId=c1&format=csv'),
    );
    expect(await screen.findByText('2 linha(s) exportada(s) — arquivo CSV baixado.')).toBeInTheDocument();
  });

  it('never sends a schoolId/challengeId param when the "all" sentinel is selected', async () => {
    mockedGet.mockImplementation((path: string) => {
      if (path === '/metrics/admin/schools') return Promise.resolve(schools as any);
      if (path === '/metrics/admin/challenges') return Promise.resolve(challenges as any);
      if (path.startsWith('/metrics/admin/export')) {
        return Promise.resolve({ rows: [], page: 1, pageSize: 500, hasMore: false } as any);
      }
      return Promise.resolve(undefined as any);
    });

    renderPage();
    await waitForOptionsLoaded();

    const [fromInput, toInput] = screen.getAllByDisplayValue('');
    await userEvent.type(fromInput, '2026-01-01');
    await userEvent.type(toInput, '2026-01-10');
    await userEvent.click(screen.getByRole('button', { name: /baixar exportação/i }));

    const call = mockedGet.mock.calls.find(([path]) => path.startsWith('/metrics/admin/export'));
    expect(call?.[0]).not.toContain('schoolId');
    expect(call?.[0]).not.toContain('challengeId');
    expect(call?.[0]).toContain('from=2026-01-01');
    expect(call?.[0]).toContain('to=2026-01-10');
  });

  it('shows the exact API error message when the export request fails (e.g. period too long)', async () => {
    mockedGet.mockImplementation((path: string) => {
      if (path === '/metrics/admin/schools') return Promise.resolve(schools as any);
      if (path === '/metrics/admin/challenges') return Promise.resolve(challenges as any);
      if (path.startsWith('/metrics/admin/export')) {
        return Promise.reject(
          new ApiError('O período pedido passa de 90 dias — reduza o intervalo e tente de novo.', 400),
        );
      }
      return Promise.resolve(undefined as any);
    });

    renderPage();
    await waitForOptionsLoaded();
    await userEvent.click(screen.getByLabelText('Desafio'));
    await userEvent.click(await screen.findByRole('option', { name: /Monte o quadrado/ }));
    await userEvent.click(screen.getByRole('button', { name: /baixar exportação/i }));

    expect(
      await screen.findByText('O período pedido passa de 90 dias — reduza o intervalo e tente de novo.'),
    ).toBeInTheDocument();
  });

  it('falls back to a generic message for a non-ApiError failure', async () => {
    mockedGet.mockImplementation((path: string) => {
      if (path === '/metrics/admin/schools') return Promise.resolve(schools as any);
      if (path === '/metrics/admin/challenges') return Promise.resolve(challenges as any);
      if (path.startsWith('/metrics/admin/export')) return Promise.reject(new Error('network down'));
      return Promise.resolve(undefined as any);
    });

    renderPage();
    await waitForOptionsLoaded();
    await userEvent.click(screen.getByLabelText('Desafio'));
    await userEvent.click(await screen.findByRole('option', { name: /Monte o quadrado/ }));
    await userEvent.click(screen.getByRole('button', { name: /baixar exportação/i }));

    expect(await screen.findByText('Não foi possível exportar agora.')).toBeInTheDocument();
  });
});
