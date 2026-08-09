import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RETRY_MESSAGE,
  DEFAULT_SUCCESS_MESSAGE,
  resolveRetryMessage,
  resolveSuccessMessage,
} from './feedbackMessages';

describe('resolveRetryMessage', () => {
  it('falls back to the default when the challenge has no custom messages', () => {
    expect(resolveRetryMessage(null)).toBe(DEFAULT_RETRY_MESSAGE);
  });

  it('falls back to the default when the field itself is null (not customized)', () => {
    expect(resolveRetryMessage({ retry: null, success: 'Custom!' })).toBe(DEFAULT_RETRY_MESSAGE);
  });

  it('AC4 — uses the teacher-customized message when present', () => {
    expect(resolveRetryMessage({ retry: 'Esse ângulo ainda não fecha — quer ajustar?', success: null })).toBe(
      'Esse ângulo ainda não fecha — quer ajustar?',
    );
  });
});

describe('resolveSuccessMessage', () => {
  it('falls back to the default when the challenge has no custom messages', () => {
    expect(resolveSuccessMessage(null)).toBe(DEFAULT_SUCCESS_MESSAGE);
  });

  it('AC4 — uses the teacher-customized message when present', () => {
    expect(resolveSuccessMessage({ retry: null, success: 'Mandou bem! 🎉' })).toBe('Mandou bem! 🎉');
  });
});
