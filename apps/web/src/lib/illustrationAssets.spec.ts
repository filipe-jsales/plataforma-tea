import { describe, expect, it } from 'vitest';
import { getIllustrationAsset } from './illustrationAssets';

describe('getIllustrationAsset', () => {
  it('resolves a known assetRef to a non-empty asset path', () => {
    const asset = getIllustrationAsset('avatar-cat');

    expect(asset).toEqual(expect.any(String));
    expect(asset.length).toBeGreaterThan(0);
  });

  it('returns different assets for different known refs', () => {
    expect(getIllustrationAsset('avatar-cat')).not.toBe(getIllustrationAsset('avatar-dog'));
  });

  it('falls back to a visible placeholder instead of crashing on an unknown assetRef', () => {
    const asset = getIllustrationAsset('does-not-exist-in-db');

    expect(asset).toContain('data:image/svg+xml');
  });
});
