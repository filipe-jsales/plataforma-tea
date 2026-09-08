import { computeAmongMostActiveThisWeek, startOfCurrentWeek } from './class-comparison';

describe('computeAmongMostActiveThisWeek', () => {
  it('never claims membership when the student has zero activity', () => {
    expect(computeAmongMostActiveThisWeek([5, 3, 0], 0)).toBe(false);
  });

  it('never claims membership when nobody in the classroom has any activity', () => {
    expect(computeAmongMostActiveThisWeek([0, 0, 0], 0)).toBe(false);
  });

  it('places a student in the top half of a classroom by activity count', () => {
    // Sorted desc: [10, 8, 4, 2] — top half (2 of 4) cutoff is 8.
    expect(computeAmongMostActiveThisWeek([10, 8, 4, 2], 8)).toBe(true);
  });

  it('excludes a student in the bottom half of a classroom by activity count', () => {
    expect(computeAmongMostActiveThisWeek([10, 8, 4, 2], 4)).toBe(false);
  });

  it('resolves ties in favor of the student (>= threshold, not > strict)', () => {
    // All tied at 3 — every student with any activity is "among the most active".
    expect(computeAmongMostActiveThisWeek([3, 3, 3, 3], 3)).toBe(true);
  });

  it('always includes at least 1 student even in a 1-student classroom', () => {
    expect(computeAmongMostActiveThisWeek([5], 5)).toBe(true);
  });
});

describe('startOfCurrentWeek', () => {
  it('resolves to the Monday 00:00 of the same week for a mid-week date', () => {
    const wednesday = new Date(2026, 8, 9, 15, 30); // 2026-09-09 is a Wednesday
    const result = startOfCurrentWeek(wednesday);

    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(7);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('resolves a Sunday to the Monday of the PREVIOUS calendar days, not the next week', () => {
    const sunday = new Date(2026, 8, 13, 10, 0); // 2026-09-13 is a Sunday
    const result = startOfCurrentWeek(sunday);

    expect(result.getDate()).toBe(7);
    expect(result.getMonth()).toBe(8);
  });
});
