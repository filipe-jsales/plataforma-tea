import {
  DEFAULT_FEEDBACK_MESSAGES,
  sanitizeFeedbackMessages,
  validateFeedbackMessages,
} from './feedback-messages';

describe('validateFeedbackMessages', () => {
  it('returns no errors when messages are undefined (professor did not customize)', () => {
    expect(validateFeedbackMessages(undefined)).toEqual([]);
  });

  it('returns no errors for empty-string fields — treated as "not customized"', () => {
    expect(validateFeedbackMessages({ retry: '', success: '   ' })).toEqual([]);
  });

  it('AC1 — rejects a retry message containing punitive language', () => {
    const errors = validateFeedbackMessages({ retry: 'Isso está errado, tente de novo.' });
    expect(errors).toEqual([
      expect.objectContaining({ parameterKey: 'retryMessage' }),
    ]);
  });

  it('AC1 — rejects "falhou" and "incorreto" too, not just "errado"', () => {
    expect(validateFeedbackMessages({ retry: 'Você falhou nessa tentativa.' })).toHaveLength(1);
    expect(validateFeedbackMessages({ success: 'Resultado incorreto detectado.' })).toHaveLength(1);
  });

  it('accepts a non-punitive descriptive/reversible message', () => {
    expect(
      validateFeedbackMessages({ retry: 'Esse ângulo ainda não fecha o quadrado — quer ajustar?' }),
    ).toEqual([]);
  });

  it('rejects a message over the max length', () => {
    const errors = validateFeedbackMessages({ success: 'a'.repeat(201) });
    expect(errors).toEqual([expect.objectContaining({ parameterKey: 'successMessage' })]);
  });

  it('validates both fields independently, accumulating errors', () => {
    const errors = validateFeedbackMessages({ retry: 'Errado.', success: 'Falhou.' });
    expect(errors).toHaveLength(2);
  });
});

describe('sanitizeFeedbackMessages', () => {
  it('returns undefined when input is undefined', () => {
    expect(sanitizeFeedbackMessages(undefined)).toBeUndefined();
  });

  it('returns undefined when both fields are empty/whitespace — never persists empty strings', () => {
    expect(sanitizeFeedbackMessages({ retry: '  ', success: '' })).toBeUndefined();
  });

  it('trims whitespace and keeps only non-empty fields', () => {
    expect(sanitizeFeedbackMessages({ retry: '  Quer tentar de novo?  ', success: '' })).toEqual({
      retry: 'Quer tentar de novo?',
    });
  });
});

describe('DEFAULT_FEEDBACK_MESSAGES', () => {
  it('AC1 — the suggested defaults themselves never use punitive language', () => {
    expect(validateFeedbackMessages(DEFAULT_FEEDBACK_MESSAGES)).toEqual([]);
  });
});
