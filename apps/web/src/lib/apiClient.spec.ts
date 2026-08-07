import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/useAuthStore';
import { apiClient, ApiError } from './apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('omits the Authorization header when there is no session token', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });

    await apiClient.get('/subjects');

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('attaches a Bearer token from the auth store when a session exists', async () => {
    useAuthStore.setState({ token: 'token-abc', user: null });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });

    await apiClient.get('/users/me');

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer token-abc');
  });

  it('serializes the body and sets the method for post/patch', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });

    await apiClient.post('/events', { type: 'block_snap' });

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ type: 'block_snap' }));
  });

  it('returns undefined for a 204 No Content response without parsing a body', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('should not be called')),
    });

    await expect(apiClient.patch('/users/me/sensory-profile')).resolves.toBeUndefined();
  });

  it('throws an ApiError with the server message and status on a failed response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Credenciais inválidas.' }),
    });

    await expect(apiClient.get('/users/me')).rejects.toMatchObject({
      message: 'Credenciais inválidas.',
      status: 401,
    });
    await expect(apiClient.get('/users/me')).rejects.toBeInstanceOf(ApiError);
  });

  it('joins a class-validator array message into a single string', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: ['campo obrigatório', 'formato inválido'] }),
    });

    await expect(apiClient.post('/events', {})).rejects.toMatchObject({
      message: 'campo obrigatório, formato inválido',
    });
  });

  it('falls back to a generic message when the error body cannot be parsed', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(apiClient.get('/subjects')).rejects.toMatchObject({ message: 'Erro 500' });
  });

  it('4.2 — delete sets the method and still returns undefined for a 204 response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('should not be called')),
    });

    await expect(apiClient.delete('/teacher/challenges/c1')).resolves.toBeUndefined();

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe('DELETE');
  });

  describe('getRaw', () => {
    it('returns the response body as text without parsing it as JSON', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('id,type\r\ne1,program_executed'),
        headers: { get: (name: string) => (name === 'Content-Type' ? 'text/csv; charset=utf-8' : null) },
      });

      const result = await apiClient.getRaw('/metrics/admin/export?format=csv');

      expect(result).toEqual({
        text: 'id,type\r\ne1,program_executed',
        contentType: 'text/csv; charset=utf-8',
      });
    });

    it('attaches the Bearer token, same as the JSON methods', async () => {
      useAuthStore.setState({ token: 'token-abc', user: null });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(''),
        headers: { get: () => null },
      });

      await apiClient.getRaw('/metrics/admin/export?format=csv');

      const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer token-abc');
    });

    it('throws an ApiError with the server message on a failed response, same as the JSON methods', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Escolha ao menos um filtro.' }),
      });

      await expect(apiClient.getRaw('/metrics/admin/export')).rejects.toMatchObject({
        message: 'Escolha ao menos um filtro.',
        status: 400,
      });
    });
  });
});
