import {
  aggregateRate,
  bucketizeAttempts,
  bucketizePercentRate,
  describeStats,
  frequencyTable,
  mean,
  median,
  sampleStdDev,
  summarizePerStudentRates,
} from './statistics';

describe('statistics', () => {
  // Dataset canônico [1..10] — valores conferidos contra numpy
  // (numpy.mean/numpy.median/numpy.std(ddof=1)/numpy.percentile, o método
  // "linear"/type 7 que este módulo replica de propósito).
  const dataset = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  describe('mean', () => {
    it('returns null for an empty array, never NaN/0 forçado', () => {
      expect(mean([])).toBeNull();
    });

    it('computes the arithmetic mean', () => {
      expect(mean(dataset)).toBe(5.5);
    });

    it('works for a single value', () => {
      expect(mean([42])).toBe(42);
    });
  });

  describe('median', () => {
    it('returns null for an empty array', () => {
      expect(median([])).toBeNull();
    });

    it('interpolates between the two middle values for an even-length dataset', () => {
      expect(median(dataset)).toBe(5.5);
    });

    it('returns the middle value for an odd-length dataset', () => {
      expect(median([1, 2, 3, 4, 5])).toBe(3);
    });

    it('does not require the input to already be sorted', () => {
      expect(median([5, 1, 3, 2, 4])).toBe(3);
    });
  });

  describe('sampleStdDev', () => {
    it('returns null for n<2 — sample stddev is mathematically undefined, never 0', () => {
      expect(sampleStdDev([])).toBeNull();
      expect(sampleStdDev([42])).toBeNull();
    });

    it('computes the sample standard deviation (n-1 denominator), matching numpy std(ddof=1)', () => {
      expect(sampleStdDev(dataset)).toBeCloseTo(3.0276503541, 8);
    });
  });

  describe('describeStats', () => {
    it('returns n=0 and every numeric field null for an empty array, never an error/NaN', () => {
      expect(describeStats([])).toEqual({
        n: 0,
        mean: null,
        median: null,
        stdDev: null,
        min: null,
        max: null,
        q1: null,
        q3: null,
      });
    });

    it('leaves stdDev null for a single value while still reporting min/max/mean', () => {
      const result = describeStats([7]);
      expect(result).toEqual({ n: 1, mean: 7, median: 7, stdDev: null, min: 7, max: 7, q1: 7, q3: 7 });
    });

    it('computes the full block for the canonical [1..10] dataset (linear/type-7 quartiles)', () => {
      const result = describeStats(dataset);
      expect(result.n).toBe(10);
      expect(result.mean).toBe(5.5);
      expect(result.median).toBe(5.5);
      expect(result.stdDev).toBeCloseTo(3.0276503541, 8);
      expect(result.min).toBe(1);
      expect(result.max).toBe(10);
      expect(result.q1).toBeCloseTo(3.25, 8);
      expect(result.q3).toBeCloseTo(7.75, 8);
    });

    it('does not mutate the input array while sorting internally', () => {
      const input = [5, 1, 3];
      describeStats(input);
      expect(input).toEqual([5, 1, 3]);
    });
  });

  describe('bucketizeAttempts', () => {
    it('returns the 4 fixed buckets (1, 2, 3, 4+) with zero counts for an empty array', () => {
      expect(bucketizeAttempts([])).toEqual([
        { label: '1', count: 0 },
        { label: '2', count: 0 },
        { label: '3', count: 0 },
        { label: '4+', count: 0 },
      ]);
    });

    it('buckets every value of 4 or more into the "4+" bucket', () => {
      const result = bucketizeAttempts([1, 1, 2, 3, 4, 5, 12]);
      expect(result).toEqual([
        { label: '1', count: 2 },
        { label: '2', count: 1 },
        { label: '3', count: 1 },
        { label: '4+', count: 3 },
      ]);
    });

    it('excludes 0-attempt students entirely — never merges them into the "1" bucket', () => {
      const result = bucketizeAttempts([0, 0, 1]);
      expect(result).toEqual([
        { label: '1', count: 1 },
        { label: '2', count: 0 },
        { label: '3', count: 0 },
        { label: '4+', count: 0 },
      ]);
    });
  });

  describe('bucketizePercentRate', () => {
    it('returns 5 fixed 20-point buckets with zero counts for an empty array', () => {
      const result = bucketizePercentRate([]);
      expect(result.map((bucket) => bucket.label)).toEqual([
        '0-20%',
        '20-40%',
        '40-60%',
        '60-80%',
        '80-100%',
      ]);
      expect(result.every((bucket) => bucket.count === 0)).toBe(true);
    });

    it('puts a 100% value in the last bucket, never leaving it uncounted', () => {
      const result = bucketizePercentRate([100]);
      expect(result[4]).toEqual({ label: '80-100%', count: 1 });
      expect(result.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
    });

    it('puts a 0% value in the first bucket', () => {
      const result = bucketizePercentRate([0]);
      expect(result[0]).toEqual({ label: '0-20%', count: 1 });
    });

    it('splits a mixed distribution across the expected buckets (each bucket is [low, high), last one inclusive)', () => {
      const result = bucketizePercentRate([10, 25, 75, 80, 95]);
      expect(result).toEqual([
        { label: '0-20%', count: 1 },
        { label: '20-40%', count: 1 },
        { label: '40-60%', count: 0 },
        { label: '60-80%', count: 1 },
        { label: '80-100%', count: 2 },
      ]);
    });
  });

  describe('frequencyTable', () => {
    it('returns an empty array for no labels', () => {
      expect(frequencyTable([])).toEqual([]);
    });

    it('counts occurrences and sorts by count desc, ties broken alphabetically', () => {
      const result = frequencyTable(['TIMES', 'ANGLE', 'TIMES', 'TIMES', 'ANGLE']);
      expect(result).toEqual([
        { label: 'TIMES', count: 3 },
        { label: 'ANGLE', count: 2 },
      ]);
    });

    it('breaks a tie in count alphabetically, for deterministic chart ordering', () => {
      const result = frequencyTable(['B', 'A']);
      expect(result).toEqual([
        { label: 'A', count: 1 },
        { label: 'B', count: 1 },
      ]);
    });
  });

  describe('aggregateRate', () => {
    it('returns n=0 and ratePercent=null when there were no attempts, never divide-by-zero', () => {
      expect(aggregateRate(0, 0)).toEqual({ n: 0, ratePercent: null });
    });

    it('computes matched/total as a percentage', () => {
      expect(aggregateRate(3, 4)).toEqual({ n: 4, ratePercent: 75 });
    });

    it('reports a genuine 0% rate distinctly from "no data"', () => {
      expect(aggregateRate(0, 5)).toEqual({ n: 5, ratePercent: 0 });
    });
  });

  describe('summarizePerStudentRates', () => {
    it('returns n=0 and null mean/stdDev for no students', () => {
      expect(summarizePerStudentRates([])).toEqual({ n: 0, meanPercent: null, stdDevPercent: null });
    });

    it('reports n as the number of STUDENTS, not attempts, with mean/stdDev of their individual rates', () => {
      const result = summarizePerStudentRates([100, 0, 50]);
      expect(result.n).toBe(3);
      expect(result.meanPercent).toBeCloseTo(50, 8);
      expect(result.stdDevPercent).toBeCloseTo(50, 8);
    });

    it('leaves stdDevPercent null for a single student, same rule as sampleStdDev', () => {
      expect(summarizePerStudentRates([80])).toEqual({ n: 1, meanPercent: 80, stdDevPercent: null });
    });
  });
});
