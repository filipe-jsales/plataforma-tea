import { RegularPolygonTemplateHandler } from './regular-polygon.handler';

describe('RegularPolygonTemplateHandler', () => {
  const handler = new RegularPolygonTemplateHandler();
  const introduced = { introducedBlockTypes: ['move_forward', 'turn', 'repeat_times'] };

  const validParams = {
    sides: 4,
    turnAngleDeg: 90,
    snapTolerancePercent: 60,
    closureTolerancePx: 5,
    enabledBlockTypes: ['move_forward', 'turn', 'repeat_times'],
    blockSize: 'medium',
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

    it('7.4 (AC3) — rejects a closure tolerance outside 1-40px with a pedagogical explanation', () => {
      const result = handler.validateParameters({ ...validParams, closureTolerancePx: 0 }, introduced);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        parameterKey: 'closureTolerancePx',
        message:
          'A margem de erro para considerar a forma fechada precisa estar entre ' +
          '1 e 40 pixels (recomendamos 5).',
      });
    });

    it('rejects a missing/invalid block size preset with a pedagogical message, never a raw scale number', () => {
      const result = handler.validateParameters({ ...validParams, blockSize: 'huge' }, introduced);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        parameterKey: 'blockSize',
        message: 'Escolha um tamanho de bloco: Pequeno, Médio ou Grande.',
      });
    });

    it('accepts each of the 3 named block size presets', () => {
      for (const blockSize of ['small', 'medium', 'large']) {
        const result = handler.validateParameters({ ...validParams, blockSize }, introduced);
        expect(result.valid).toBe(true);
      }
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
      expect(keys).toEqual([
        'blockSize',
        'closureTolerancePx',
        'enabledBlockTypes',
        'sides',
        'snapTolerancePercent',
        'turnAngleDeg',
      ]);
    });
  });

  describe('buildChallengeConfig', () => {
    it('produces a free-build (stage: create) challenge with the goal derived from sides/turnAngleDeg', () => {
      const config = handler.buildChallengeConfig(validParams);

      expect(config).toEqual({
        stage: 'create',
        allowedBlockTypes: ['move_forward', 'turn', 'repeat_times'],
        goal: { shape: 'regular_polygon', sides: 4, turnAngleDeg: 90, closureTolerancePx: 5 },
        snapTolerancePercent: 60,
        blockScale: 1.3,
      });
    });

    it('translates each named block size preset into its scale factor, never the raw preset string', () => {
      expect(handler.buildChallengeConfig({ ...validParams, blockSize: 'small' }).blockScale).toBe(1);
      expect(handler.buildChallengeConfig({ ...validParams, blockSize: 'large' }).blockScale).toBe(1.6);
    });
  });

  describe('F13 - stage modify (professor authors the middle phase)', () => {
    const modifyParams = { ...validParams, stage: 'modify', enabledBlockTypes: [], snapTolerancePercent: undefined };

    it('treats a missing stage as create, so challenges saved before F13 keep working', () => {
      expect(handler.validateParameters(validParams, introduced).valid).toBe(true);
      expect(handler.buildChallengeConfig(validParams).stage).toBe('create');
    });

    it('rejects an unknown stage with a pedagogical message, never a technical one', () => {
      const result = handler.validateParameters({ ...validParams, stage: 'use' }, introduced);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        parameterKey: 'stage',
        message: 'Escolha o tipo de atividade: montar do zero ou mudar um programa pronto.',
      });
    });

    it('does not ask for a block palette or snap tolerance when the program comes ready-made', () => {
      const result = handler.validateParameters(modifyParams, introduced);

      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('still blocks an impossible polygon in modify (the starting program must close)', () => {
      const result = handler.validateParameters({ ...modifyParams, sides: 3, turnAngleDeg: 200 }, introduced);

      expect(result.valid).toBe(false);
      expect(result.errors.find((e) => e.parameterKey === 'turnAngleDeg')?.message).toContain('não fecha');
    });

    it('requires repeat, move and turn to have been introduced in a Use challenge of the topic', () => {
      const result = handler.validateParameters(modifyParams, { introducedBlockTypes: ['move_forward', 'turn'] });

      expect(result.valid).toBe(false);
      expect(result.errors.map((e) => e.parameterKey)).toEqual(['stage']);
      expect(result.errors[0].message).toContain('Repetir');
    });

    it('builds a stage modify config: ready program, editable sides/angle, no teacher-chosen palette', () => {
      const config = handler.buildChallengeConfig({ ...modifyParams, sides: 6, turnAngleDeg: 60 });

      expect(config.stage).toBe('modify');
      expect(config.allowedBlockTypes).toEqual(['repeat_times', 'move_forward', 'turn']);
      expect(config.goal).toEqual({ shape: 'regular_polygon', sides: 6, turnAngleDeg: 60, closureTolerancePx: 5 });
      expect(config.program).toEqual({
        type: 'repeat_times',
        fields: { TIMES: 6 },
        inputs: {
          DO: {
            block: {
              type: 'move_forward',
              next: { block: { type: 'turn', fields: { DIR: 'RIGHT', ANGLE: 60 } } },
            },
          },
        },
      });
      expect(config.snapTolerancePercent).toBeUndefined();
      expect(config.blockScale).toBe(1.3);
    });

    it('unlocks exactly TIMES and ANGLE, with bounds that always contain the starting values', () => {
      const config = handler.buildChallengeConfig({ ...modifyParams, sides: 12, turnAngleDeg: 30 });

      expect(config.editableFields).toEqual([
        { blockType: 'repeat_times', fieldName: 'TIMES', label: 'Número de lados', min: 3, max: 12 },
        { blockType: 'turn', fieldName: 'ANGLE', label: 'Ângulo de giro (graus)', min: 1, max: 359 },
      ]);
    });

    it('keeps the preview goal identical to the create stage (same target shape)', () => {
      expect(handler.buildPreviewGoal(modifyParams)).toEqual(handler.buildPreviewGoal(validParams));
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
