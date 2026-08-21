import {
  getPrimmQuestionSuggestion,
  sanitizePrimmQuestions,
  validatePrimmQuestions,
} from './primm-questions';

describe('validatePrimmQuestions', () => {
  it('requires both questions — errors when input is undefined', () => {
    const errors = validatePrimmQuestions(undefined);
    expect(errors).toEqual([
      expect.objectContaining({ parameterKey: 'predictQuestion' }),
      expect.objectContaining({ parameterKey: 'investigationQuestion' }),
    ]);
  });

  it('rejects an empty-string or whitespace-only question — never treated as "not customized" (unlike feedbackMessages)', () => {
    const errors = validatePrimmQuestions({ predictQuestion: '   ', investigationQuestion: '' });
    expect(errors).toHaveLength(2);
  });

  it('accepts both questions when both are non-empty', () => {
    expect(
      validatePrimmQuestions({
        predictQuestion: 'O que vai acontecer?',
        investigationQuestion: 'O que você percebeu?',
      }),
    ).toEqual([]);
  });

  it('validates each field independently, accumulating only the missing one', () => {
    const errors = validatePrimmQuestions({ predictQuestion: 'O que vai acontecer?' });
    expect(errors).toEqual([expect.objectContaining({ parameterKey: 'investigationQuestion' })]);
  });

  it('rejects a question over the max length, distinct from the "required" error', () => {
    const errors = validatePrimmQuestions({
      predictQuestion: 'a'.repeat(501),
      investigationQuestion: 'O que você percebeu?',
    });
    expect(errors).toEqual([expect.objectContaining({ parameterKey: 'predictQuestion' })]);
    expect(errors[0].message).not.toMatch(/obrigatória/);
  });

  it('does NOT reject a long-but-accessible question — no restrictively short cap (AC4)', () => {
    const longAccessibleQuestion =
      'Antes de clicar em Executar: você acha que a figura vai fechar certinho, com todos os lados do mesmo tamanho? Pensa um pouquinho antes de decidir.';
    expect(longAccessibleQuestion.length).toBeLessThan(500);
    expect(
      validatePrimmQuestions({
        predictQuestion: longAccessibleQuestion,
        investigationQuestion: 'O que você percebeu?',
      }),
    ).toEqual([]);
  });
});

describe('sanitizePrimmQuestions', () => {
  it('trims both questions', () => {
    expect(
      sanitizePrimmQuestions({ predictQuestion: '  O que vai acontecer?  ', investigationQuestion: '  E aí?  ' }),
    ).toEqual({ predictQuestion: 'O que vai acontecer?', investigationQuestion: 'E aí?' });
  });
});

describe('getPrimmQuestionSuggestion', () => {
  it('returns the specific suggestion for a known template key (regular_polygon)', () => {
    const suggestion = getPrimmQuestionSuggestion('regular_polygon');
    expect(suggestion.predictQuestion).toMatch(/lados/);
  });

  it('falls back to a generic suggestion for an unknown template key, never throws', () => {
    const suggestion = getPrimmQuestionSuggestion('some_future_template');
    expect(suggestion.predictQuestion).toBeTruthy();
    expect(suggestion.investigationQuestion).toBeTruthy();
  });
});
