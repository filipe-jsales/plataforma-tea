import { isWorkToolsLevelConfig } from './mini-game-level-config.interface';

describe('isWorkToolsLevelConfig', () => {
  it('accepts a minimal valid shape', () => {
    expect(
      isWorkToolsLevelConfig({
        scenarios: [],
        tools: [],
        correctMatches: [],
        statements: [],
      }),
    ).toBe(true);
  });

  it('rejects a non-object value', () => {
    expect(isWorkToolsLevelConfig(null)).toBe(false);
    expect(isWorkToolsLevelConfig('fractions')).toBe(false);
  });

  it('rejects a config missing any of the 4 required arrays', () => {
    expect(isWorkToolsLevelConfig({ tools: [], correctMatches: [], statements: [] })).toBe(false);
    expect(isWorkToolsLevelConfig({ scenarios: [], correctMatches: [], statements: [] })).toBe(false);
    expect(isWorkToolsLevelConfig({ scenarios: [], tools: [], statements: [] })).toBe(false);
    expect(isWorkToolsLevelConfig({ scenarios: [], tools: [], correctMatches: [] })).toBe(false);
  });

  it('accepts optional fields (presetMatches/presetStatementAnswers/scenarioPool) when present', () => {
    expect(
      isWorkToolsLevelConfig({
        scenarios: [{ id: 's1', label: 'Cenário', icon: '💡' }],
        tools: [{ id: 't1', label: 'Ferramenta', icon: '🖨️' }],
        correctMatches: [{ scenarioId: 's1', toolId: 't1' }],
        statements: [{ id: 'st1', text: 'Afirmação', isTrue: true, explanation: 'Porque sim.' }],
        presetMatches: [{ scenarioId: 's1', toolId: 't1' }],
        presetStatementAnswers: { st1: true },
      }),
    ).toBe(true);
  });
});
