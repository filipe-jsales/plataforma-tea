import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ChallengesService } from '../challenges/challenges.service';
import { SurveyResponse } from './entities/survey-response.entity';
import { CHALLENGE_CREATION_SURVEY_KEY, SurveysService } from './surveys.service';

describe('SurveysService', () => {
  let service: SurveysService;
  let surveyResponsesRepository: jest.Mocked<Repository<SurveyResponse>>;
  let challengesService: jest.Mocked<ChallengesService>;

  beforeEach(() => {
    surveyResponsesRepository = {
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => ({ id: 'survey-1', ...input })),
    } as unknown as jest.Mocked<Repository<SurveyResponse>>;
    challengesService = {
      findByIdForOwner: jest.fn(),
    } as unknown as jest.Mocked<ChallengesService>;

    service = new SurveysService(surveyResponsesRepository, challengesService);
  });

  it('never accepts a survey about a challenge the teacher does not own', async () => {
    challengesService.findByIdForOwner.mockResolvedValue(null);

    await expect(
      service.submitChallengeCreationSurvey('teacher-1', {
        challengeId: 'challenge-1',
        status: 'submitted',
        quantitative: { ease_of_creation: 5 },
      }),
    ).rejects.toThrow(NotFoundException);
    expect(surveyResponsesRepository.save).not.toHaveBeenCalled();
  });

  it('saves a submitted response scoped to the survey key, teacher, challenge and its template', async () => {
    challengesService.findByIdForOwner.mockResolvedValue({
      id: 'challenge-1',
      template: { key: 'regular_polygon' },
    } as any);

    const result = await service.submitChallengeCreationSurvey('teacher-1', {
      challengeId: 'challenge-1',
      status: 'submitted',
      quantitative: { ease_of_creation: 4 },
      qualitative: { difficulties: 'nada de especial' },
    });

    expect(surveyResponsesRepository.create).toHaveBeenCalledWith({
      surveyKey: CHALLENGE_CREATION_SURVEY_KEY,
      teacherUserId: 'teacher-1',
      challengeId: 'challenge-1',
      templateKey: 'regular_polygon',
      status: 'submitted',
      quantitative: { ease_of_creation: 4 },
      qualitative: { difficulties: 'nada de especial' },
    });
    expect(result.id).toBe('survey-1');
  });

  it('always stores an empty quantitative/qualitative payload for a declined response, even if the body sent answers by mistake', async () => {
    challengesService.findByIdForOwner.mockResolvedValue({ id: 'challenge-1', template: null } as any);

    await service.submitChallengeCreationSurvey('teacher-1', {
      challengeId: 'challenge-1',
      status: 'declined',
      quantitative: { ease_of_creation: 5 },
      qualitative: { difficulties: 'ignorado' },
    });

    expect(surveyResponsesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'declined', quantitative: {}, qualitative: {} }),
    );
  });

  it('falls back to null templateKey when the challenge has no template loaded', async () => {
    challengesService.findByIdForOwner.mockResolvedValue({ id: 'challenge-1', template: null } as any);

    await service.submitChallengeCreationSurvey('teacher-1', {
      challengeId: 'challenge-1',
      status: 'submitted',
      quantitative: {},
    });

    expect(surveyResponsesRepository.create).toHaveBeenCalledWith(expect.objectContaining({ templateKey: null }));
  });

  it('rejects an out-of-range Likert value before it ever reaches the repository', async () => {
    challengesService.findByIdForOwner.mockResolvedValue({ id: 'challenge-1', template: null } as any);

    await expect(
      service.submitChallengeCreationSurvey('teacher-1', {
        challengeId: 'challenge-1',
        status: 'submitted',
        quantitative: { ease_of_creation: 9 },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(surveyResponsesRepository.save).not.toHaveBeenCalled();
  });
});
