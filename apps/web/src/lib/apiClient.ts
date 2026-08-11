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
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  // 1.5.1 — sessão expirada/token inválido: só quando a requisição JÁ TINHA
  // um token (isto é, achávamos que havia sessão) e o backend responde 401
  // é que isso significa "sessão morreu" — nunca dispara em uma tentativa
  // de login sem sessão ainda (essas chamadas não carregam token, e um 401
  // ali é só "credenciais erradas", tratado normalmente por
  // throwForErrorResponse, a tela de login precisa continuar montada pra
  // mostrar a mensagem). Encerra a sessão local (JWT é stateless — não há
  // endpoint de revogação no backend) e manda pro login, em vez de deixar a
  // tela presa repetindo o mesmo 401 em todo request seguinte.
  if (response.status === 401 && token) {
    useAuthStore.getState().clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
  return response;
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
  // 4.2 — exclusão de desafio do professor (AC5: mesma tela de gestão,
  // nenhuma delas expõe estrutura de blocos). `request` já trata 204 sem
  // corpo (ver acima), então isto funciona igual pra qualquer DELETE futuro.
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
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
