import { RegularPolygonTemplateHandler } from './regular-polygon.handler';

describe('RegularPolygonTemplateHandler', () => {
  const handler = new RegularPolygonTemplateHandler();
  const introduced = { introducedBlockTypes: ['move_forward', 'turn', 'repeat_times'] };

  const validParams = {
    sides: 4,
    turnAngleDeg: 90,
    snapTolerancePercent: 60,
    enabledBlockTypes: ['move_forward', 'turn', 'repeat_times'],
  };

  describe('validateParameters', () => {
    it('accepts a well-formed regular polygon (4 sides, 90°, closes at 360°)', () => {
      const result = handler.validateParameters(validParams, introduced);

      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('rejects a number of sides outside 3-12 with a pedagogical message, never a generic/technical one', () => {
      const result = handler.validateParameters({ ...validParams, sides: 2 }, introduced);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        parameterKey: 'sides',
        message: 'Escolha um número de lados entre 3 e 12.',
      });
      const joined = result.errors.map((e) => e.message).join(' ');
      expect(joined.toLowerCase()).not.toMatch(/xml|json|schema|blockly/);
    });

    it('AC3 — flags the card\'s literal example (3 sides, 200° turn) as an impossible polygon and suggests a valid angle', () => {
      const result = handler.validateParameters(
        { ...validParams, sides: 3, turnAngleDeg: 200 },
        introduced,
      );

      expect(result.valid).toBe(false);
      const angleError = result.errors.find((e) => e.parameterKey === 'turnAngleDeg');
      expect(angleError?.message).toContain('não fecha');
      expect(angleError?.message).toContain('120°');
    });

    it('accepts any sides/angle combination whose product is a multiple of 360, not just squares', () => {
      // Hexágono: 6 × 60 = 360.
      const result = handler.validateParameters({ ...validParams, sides: 6, turnAngleDeg: 60 }, introduced);

      expect(result.valid).toBe(true);
    });

    it('AC3 — rejects 0% snap tolerance with a pedagogical explanation, never silently accepting it', () => {
      const result = handler.validateParameters({ ...validParams, snapTolerancePercent: 0 }, introduced);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        parameterKey: 'snapTolerancePercent',
        message:
          'A tolerância de encaixe não pode ficar em 0% — o aluno não conseguiria encaixar os blocos. ' +
          'Escolha um valor entre 10% e 100% (recomendamos 60%).',
      });
    });

    it('rejects an empty block palette', () => {
      const result = handler.validateParameters({ ...validParams, enabledBlockTypes: [] }, introduced);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        parameterKey: 'enabledBlockTypes',
        message: 'Selecione ao menos um bloco para este desafio.',
      });
    });

    it('rejects a block that was never introduced in a stage "use" challenge of the topic (curriculum progression rule)', () => {
      const result = handler.validateParameters(
        { ...validParams, enabledBlockTypes: ['move_forward', 'turn', 'never_introduced_block'] },
        introduced,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.parameterKey === 'enabledBlockTypes')).toBe(true);
    });

    it('requires move_forward and turn — a polygon cannot be drawn without them', () => {
      const result = handler.validateParameters(
        { ...validParams, enabledBlockTypes: ['repeat_times'] },
        { introducedBlockTypes: ['move_forward', 'turn', 'repeat_times'] },
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        parameterKey: 'enabledBlockTypes',
        message: 'Um desafio de polígono precisa dos blocos "Mover para frente" e "Girar" habilitados.',
      });
    });

    it('collects every violated parameter at once, not just the first one found', () => {
      const result = handler.validateParameters(
        { sides: 100, turnAngleDeg: 999, snapTolerancePercent: 0, enabledBlockTypes: [] },
        introduced,
      );

      const keys = result.errors.map((e) => e.parameterKey).sort();
      expect(keys).toEqual(['enabledBlockTypes', 'sides', 'snapTolerancePercent', 'turnAngleDeg']);
    });
  });

  describe('buildChallengeConfig', () => {
    it('produces a free-build (stage: create) challenge with the goal derived from sides/turnAngleDeg', () => {
      const config = handler.buildChallengeConfig(validParams);

      expect(config).toEqual({
        stage: 'create',
        allowedBlockTypes: ['move_forward', 'turn', 'repeat_times'],
        goal: { shape: 'regular_polygon', sides: 4, turnAngleDeg: 90 },
        snapTolerancePercent: 60,
      });
    });
  });

  describe('buildPreviewGoal', () => {
    it('exposes only the numeric goal — never the block palette or any Blockly structure', () => {
      const goal = handler.buildPreviewGoal(validParams);

      expect(goal).toEqual({ shape: 'regular_polygon', sides: 4, turnAngleDeg: 90 });
      expect(Object.keys(goal)).not.toContain('allowedBlockTypes');
    });
  });
});
