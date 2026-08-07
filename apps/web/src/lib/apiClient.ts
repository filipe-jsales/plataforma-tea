import { useAuthStore } from '../stores/useAuthStore';

const API_URL = import.meta.env.VITE_API_URL as string;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function authorizedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token;
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

async function throwForErrorResponse(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
  throw new ApiError(message ?? `Erro ${response.status}`, response.status);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await authorizedFetch(path, options);

  if (!response.ok) {
    await throwForErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export interface RawResponse {
  text: string;
  contentType: string | null;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  // 6.6 — para respostas que não são JSON (ex.: exportação em CSV,
  // `GET /metrics/admin/export?format=csv`) — `get`/`post`/`patch` sempre
  // fazem `response.json()`, o que quebraria num corpo CSV. Mesma
  // autenticação/tratamento de erro de `request`, só sem assumir o
  // Content-Type da resposta de sucesso.
  getRaw: async (path: string): Promise<RawResponse> => {
    const response = await authorizedFetch(path);
    if (!response.ok) {
      await throwForErrorResponse(response);
    }
    return { text: await response.text(), contentType: response.headers.get('Content-Type') };
  },
};
