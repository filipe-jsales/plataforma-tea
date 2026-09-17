import { beforeEach, describe, expect, it } from 'vitest';
import { useGuidedTourStore } from './useGuidedTourStore';

describe('useGuidedTourStore', () => {
  beforeEach(() => {
    useGuidedTourStore.setState({ seenTours: {} });
  });

  it('has not seen a tour by default', () => {
    expect(useGuidedTourStore.getState().hasSeenTour('teacher-challenge-form')).toBe(false);
  });

  it('marks a tour as seen under its own key, never affecting other tours', () => {
    useGuidedTourStore.getState().markTourSeen('teacher-challenge-form');

    expect(useGuidedTourStore.getState().hasSeenTour('teacher-challenge-form')).toBe(true);
    expect(useGuidedTourStore.getState().hasSeenTour('some-other-tour')).toBe(false);
  });
});
