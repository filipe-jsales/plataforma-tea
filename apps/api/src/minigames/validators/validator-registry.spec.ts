import { getMiniGameLevelValidator } from './validator-registry';

describe('getMiniGameLevelValidator', () => {
  it('resolves the validator for a known gameKey', () => {
    const validator = getMiniGameLevelValidator('fractions_factory');

    expect(validator).toBeDefined();
    expect(validator?.gameKey).toBe('fractions_factory');
  });

  it('returns undefined for an unknown gameKey (catalog row without a matching validator)', () => {
    // Cast só pro teste — TS não deixaria passar um MiniGameKey inventado,
    // mas o service precisa lidar com o caso "linha de catálogo cadastrada
    // sem o validador correspondente ainda ter sido implantado".
    const validator = getMiniGameLevelValidator('work_tools_match' as never);

    expect(validator).toBeUndefined();
  });
});
