import { BadRequestException } from '@nestjs/common';
import { validateQualitativeAnswers, validateQuantitativeAnswers } from './survey-answers';

describe('validateQuantitativeAnswers', () => {
  it('returns an empty object when no answers were given', () => {
    expect(validateQuantitativeAnswers(undefined)).toEqual({});
  });

  it('accepts integer Likert values from 1 to 5', () => {
    expect(validateQuantitativeAnswers({ ease_of_creation: 1, overall_satisfaction: 5 })).toEqual({
      ease_of_creation: 1,
      overall_satisfaction: 5,
    });
  });

  it('rejects a value below the 1-5 range', () => {
    expect(() => validateQuantitativeAnswers({ ease_of_creation: 0 })).toThrow(BadRequestException);
  });

  it('rejects a value above the 1-5 range', () => {
    expect(() => validateQuantitativeAnswers({ ease_of_creation: 6 })).toThrow(BadRequestException);
  });

  it('rejects a non-integer value — never silently rounds/truncates a tampered request', () => {
    expect(() => validateQuantitativeAnswers({ ease_of_creation: 3.5 })).toThrow(BadRequestException);
  });
});

describe('validateQualitativeAnswers', () => {
  it('returns an empty object when no answers were given', () => {
    expect(validateQualitativeAnswers(undefined)).toEqual({});
  });

  it('trims whitespace from each answer', () => {
    expect(validateQualitativeAnswers({ difficulties: '  faltou clareza no campo X  ' })).toEqual({
      difficulties: 'faltou clareza no campo X',
    });
  });

  it('drops an answer that is empty/whitespace-only — partial response is valid, never coerced', () => {
    expect(validateQualitativeAnswers({ difficulties: '   ', suggestions: 'mais exemplos' })).toEqual({
      suggestions: 'mais exemplos',
    });
  });

  it('rejects an answer over the max length instead of silently truncating research data', () => {
    const tooLong = 'a'.repeat(4001);
    expect(() => validateQualitativeAnswers({ difficulties: tooLong })).toThrow(BadRequestException);
  });

  it('rejects a non-string value', () => {
    expect(() => validateQualitativeAnswers({ difficulties: 123 as unknown as string })).toThrow(BadRequestException);
  });
});
