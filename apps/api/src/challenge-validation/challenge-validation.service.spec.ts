import { NotFoundException } from '@nestjs/common';
import { ChallengesService } from '../challenges/challenges.service';
import { EventCategory } from '../common/enums/event-category.enum';
import { EventsService } from '../events/events.service';
import { ChallengeValidationService } from './challenge-validation.service';

describe('ChallengeValidationService (3.17)', () => {
  let service: ChallengeValidationService;
  let challengesService: jest.Mocked<ChallengesService>;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(() => {
    challengesService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ChallengesService>;
    eventsService = {
      record: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;
    service = new ChallengeValidationService(challengesService, eventsService);
  });

  it('throws NotFoundException when the challenge does not exist', async () => {
    challengesService.findById.mockResolvedValue(null);

    await expect(
      service.submitWaterProgram('pseudo-1', 'c1', null),
    ).rejects.toThrow(NotFoundException);
    expect(eventsService.record).not.toHaveBeenCalled();
  });

  it('no-ops (validated: false) when the challenge has no expectedModel — nunca lança erro', async () => {
    challengesService.findById.mockResolvedValue({
      id: 'c1',
      config: { stage: 'use', allowedBlockTypes: [], goal: {} },
    } as any);

    const result = await service.submitWaterProgram('pseudo-1', 'c1', null);

    expect(result).toEqual({ validated: false });
    expect(eventsService.record).not.toHaveBeenCalled();
  });

  it('no-ops when the challenge config is not set up yet (isChallengeConfig false)', async () => {
    challengesService.findById.mockResolvedValue({
      id: 'c1',
      config: {},
    } as any);

    const result = await service.submitWaterProgram('pseudo-1', 'c1', null);

    expect(result).toEqual({ validated: false });
    expect(eventsService.record).not.toHaveBeenCalled();
  });

  it('runs the program against every test case and records a single RD-C event with the full result', async () => {
    challengesService.findById.mockResolvedValue({
      id: 'c1',
      config: {
        stage: 'create',
        allowedBlockTypes: [],
        goal: {},
        expectedModel: {
          scenarioLabel: 'Dia muito quente',
          testCases: [
            { temperatureC: -20, expectedState: 'SOLID' },
            { temperatureC: 20, expectedState: 'LIQUID' },
          ],
        },
      },
    } as any);

    const program = {
      type: 'conditional_if',
      fields: { THRESHOLD: 0 },
      inputs: {
        DO_THEN: {
          block: { type: 'set_water_state', fields: { STATE: 'LIQUID' } },
        },
        DO_ELSE: {
          block: { type: 'set_water_state', fields: { STATE: 'SOLID' } },
        },
      },
    };

    const result = await service.submitWaterProgram('pseudo-1', 'c1', program);

    expect(result).toEqual({ validated: true });
    expect(eventsService.record).toHaveBeenCalledTimes(1);
    const call = eventsService.record.mock.calls[0][0];
    expect(call.studentPseudoId).toBe('pseudo-1');
    expect(call.category).toBe(EventCategory.CURRICULAR);
    expect(call.type).toBe('water_program_validated');
    expect(call.challengeId).toBe('c1');
    expect(call.payload).toMatchObject({
      scenario_label: 'Dia muito quente',
      correct_count: 2,
      total_count: 2,
      all_passed: true,
    });
  });

  it('never leaks the expected model or case results back to the caller — only { validated }', async () => {
    challengesService.findById.mockResolvedValue({
      id: 'c1',
      config: {
        stage: 'create',
        allowedBlockTypes: [],
        goal: {},
        expectedModel: {
          scenarioLabel: 'X',
          testCases: [{ temperatureC: 0, expectedState: 'LIQUID' }],
        },
      },
    } as any);

    const result = await service.submitWaterProgram('pseudo-1', 'c1', null);

    expect(Object.keys(result)).toEqual(['validated']);
  });
});
