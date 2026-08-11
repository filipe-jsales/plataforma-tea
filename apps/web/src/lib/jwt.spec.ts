import { describe, expect, it } from 'vitest';
import { isTokenExpired } from './jwt';

function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

describe('isTokenExpired', () => {
  it('returns false for a token whose exp is in the future', () => {
    const token = makeToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 });

    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns true for a token whose exp is in the past', () => {
    const token = makeToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 3600 });

    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true (fails safe) for a token with no exp claim', () => {
    const token = makeToken({ sub: 'user-1' });

    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true (fails safe) for a malformed token', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true);
  });

  it('returns true (fails safe) for a token whose payload is not valid JSON', () => {
    expect(isTokenExpired('header.not-base64-json.signature')).toBe(true);
  });
});
