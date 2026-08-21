import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ChallengeStage,
  isChallengeConfig,
  type WaterExpectedModel,
  type WaterState,
} from '../challenges/challenge-config.interface';
import { ChallengesService } from '../challenges/challenges.service';
import { EventCategory } from '../common/enums/event-category.enum';
import { InteractionEvent } from '../events/entities/interaction-event.entity';
import { EventsService } from '../events/events.service';
import { SettingsService } from '../settings/settings.service';
import { MetricsService } from './metrics.service';
import {
  DescriptiveStats,
  FrequencyBucket,
  PerStudentRateSummary,
  RateSummary,
  aggregateRate,
  bucketizeAttempts,
  bucketizePercentRate,
  describeStats,
  frequencyTable,
  summarizePerStudentRates,
} from './statistics';

export interface RateReport {
  aggregate: RateSummary;
  perStudent: PerStudentRateSummary;
  perStudentHistogram: FrequencyBucket[];
}

export interface ModifyInsights {
  attemptsUntilMatch: DescriptiveStats;
  predictionMatchRate: RateReport;
  mostChangedFieldDistribution: FrequencyBucket[];
  attemptsVsMatchRateScatter: { attempts: number; matchRatePercent: number }[];
}

export interface UseInsights {
  attemptsBeforeProceed: DescriptiveStats;
  predictionMatchRate: RateReport;
  investigationResponses: { n: number };
}

// 3.17 — resultado agregado da validação backend contra o `expectedModel`
// do desafio 2.3 (nunca visível ao aluno — só chega aqui, no relatório do
// admin/pesquisador). `passes`/`submissions` por caso deixam claro QUAIS
// temperaturas o time da turma erra mais, sem nunca apontar um aluno
// específico (AC2 de 3.17: "visível apenas ao professor", nunca "erro"/
// "nota" individual).
export interface CreateValidationCaseInsight {
  temperatureC: number;
  expectedState: WaterState;
  passes: number;
  submissions: number;
}

export interface CreateInsights {
  scenarioLabel: string;
  allCasesPassedRate: RateReport;
  perCase: CreateValidationCaseInsight[];
}

export interface ChallengeDepthReport {
  challengeId: string;
  title: string;
  stage: ChallengeStage;
  minSampleSizeThreshold: number;
  studentsReached: number;
  studentsCompleted: number;
  attemptsPerStudent: DescriptiveStats;
  attemptsHistogram: FrequencyBucket[];
  timeToFirstExecutionMs: DescriptiveStats;
  eventsByCategory: Record<EventCategory, number>;
  eventsByType: FrequencyBucket[];
  modifyInsights?: ModifyInsights;
  useInsights?: UseInsights;
  createInsights?: CreateInsights;
}

export interface ChallengePickerOption {
  id: string;
  title: string;
  stage: ChallengeStage | null;
  topicName: string;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function asNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isWaterState(value: unknown): value is WaterState {
  return value === 'SOLID' || value === 'LIQUID' || value === 'GAS';
}

// 3.17 — `event.payload.case_results` é jsonb livre (mesmo racional de
// `asStringArray` acima) — nunca confia na forma sem checar campo a campo,
// mesmo vindo de um evento gravado pelo próprio backend (defesa em
// profundidade contra um schema futuro divergente).
function asCaseResults(
  value: unknown,
): { temperatureC: number; expectedState: WaterState; passed: boolean }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Record<string, unknown>;
    const temperatureC = asFiniteNumber(candidate.temperatureC);
    if (temperatureC === null || !isWaterState(candidate.expectedState))
      return [];
    return [
      {
        temperatureC,
        expectedState: candidate.expectedState,
        passed: candidate.passed === true,
      },
    ];
  });
}

function groupByStudent(
  events: InteractionEvent[],
): Map<string, InteractionEvent[]> {
  const groups = new Map<string, InteractionEvent[]>();
  for (const event of events) {
    const existing = groups.get(event.studentPseudoId);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(event.studentPseudoId, [event]);
    }
  }
  return groups;
}

// 6.5 — relatório de profundidade por desafio, "o que um revisor de artigo
// esperaria ver" (não o mínimo que cabe numa tela). Serviço de orquestração:
// busca valores brutos por aluno (EventsService) e delega todo cálculo
// estatístico a `statistics.ts` — nenhuma média/desvio/quartil é calculado
// aqui nem em SQL agregado (decisão técnica confirmada, ver
// docs/ai/backlog/metricas-professor-admin.md → M5). Reaproveita o motor
// 6.1 (MetricsService) pra status/tentativas por aluno — mesma fonte que
// 6.3/6.4, nenhuma query de status duplicada.
@Injectable()
export class MetricsAdminChallengeService {
  constructor(
    private readonly challengesService: ChallengesService,
    private readonly eventsService: EventsService,
    private readonly settingsService: SettingsService,
    private readonly metricsService: MetricsService,
  ) {}

  async listChallenges(): Promise<ChallengePickerOption[]> {
    const challenges = await this.challengesService.findAllWithTopic();
    return challenges.map((challenge) => ({
      id: challenge.id,
      title: challenge.title,
      stage: isChallengeConfig(challenge.config)
        ? challenge.config.stage
        : null,
      topicName: challenge.topic?.name ?? '—',
    }));
  }

  async getChallengeReport(challengeId: string): Promise<ChallengeDepthReport> {
    const challenge = await this.challengesService.findById(challengeId);
    if (!challenge) {
      throw new NotFoundException('Desafio não encontrado.');
    }
    if (!isChallengeConfig(challenge.config)) {
      throw new NotFoundException(
        'Este desafio ainda não tem blocos configurados.',
      );
    }
    const stage = challenge.config.stage;

    // "N que chegou até o desafio" (AC de 6.5) — plataforma inteira, sem
    // escopo de turma/escola (ver nota em EventsService). População-base de
    // todo o resto do relatório.
    const reachedPseudoIds =
      await this.eventsService.findDistinctStudentsForChallenge(challengeId);

    const [
      settings,
      siblings,
      earliestAnyEvent,
      earliestExecution,
      eventsByCategory,
      eventsByTypeRaw,
    ] = await Promise.all([
      this.settingsService.getOrCreate(),
      this.challengesService.findByTopicIdOrdered(challenge.topicId),
      this.eventsService.findEarliestEventTimestamps(challengeId),
      this.eventsService.findEarliestEventTimestamps(
        challengeId,
        'program_executed',
      ),
      this.eventsService.countEventsByCategoryForChallenge(challengeId),
      this.eventsService.countEventsByTypeForChallenge(challengeId),
    ]);

    // `nextChallengeId` (só importa pra resolver "completed" na fase
    // `modify`, ver MetricsService) é a posição do próprio desafio entre os
    // irmãos do tópico — mesmo raciocínio de ChallengesController/
    // MetricsTeacherService.
    const ownIndex = siblings.findIndex(
      (sibling) => sibling.id === challenge.id,
    );
    const nextChallengeId =
      ownIndex >= 0 ? (siblings[ownIndex + 1]?.id ?? null) : null;
    const progress = await this.metricsService.getChallengeProgressForStudents(
      reachedPseudoIds,
      {
        challengeId,
        stage,
        nextChallengeId,
      },
    );

    const attemptsValues = Array.from(progress.values()).map(
      (entry) => entry.attempts,
    );
    const studentsCompleted = Array.from(progress.values()).filter(
      (entry) => entry.status === 'completed',
    ).length;

    const timeToFirstExecutionMs: number[] = [];
    for (const pseudoId of reachedPseudoIds) {
      const start = earliestAnyEvent.get(pseudoId);
      const firstExecution = earliestExecution.get(pseudoId);
      if (start && firstExecution) {
        timeToFirstExecutionMs.push(firstExecution.getTime() - start.getTime());
      }
    }

    const eventsByType: FrequencyBucket[] = eventsByTypeRaw.map((row) => ({
      label: row.type,
      count: row.count,
    }));

    const report: ChallengeDepthReport = {
      challengeId: challenge.id,
      title: challenge.title,
      stage,
      minSampleSizeThreshold: settings.minSampleSizeThreshold,
      studentsReached: reachedPseudoIds.length,
      studentsCompleted,
      attemptsPerStudent: describeStats(attemptsValues),
      attemptsHistogram: bucketizeAttempts(attemptsValues),
      timeToFirstExecutionMs: describeStats(timeToFirstExecutionMs),
      eventsByCategory,
      eventsByType,
    };

    if (stage === 'modify') {
      report.modifyInsights = await this.buildModifyInsights(challengeId);
    } else if (stage === 'use') {
      report.useInsights = await this.buildUseInsights(challengeId);
    } else if (stage === 'create' && challenge.config.expectedModel) {
      report.createInsights = await this.buildCreateInsights(
        challengeId,
        challenge.config.expectedModel,
      );
    }

    return report;
  }

  private async buildModifyInsights(
    challengeId: string,
  ): Promise<ModifyInsights> {
    const attempts = await this.eventsService.findModifyAttempts(challengeId);
    const byStudent = groupByStudent(attempts);

    const attemptsUntilMatchValues: number[] = [];
    const changedValuesFlat: string[] = [];
    const perStudentRates: number[] = [];
    const scatter: { attempts: number; matchRatePercent: number }[] = [];
    let totalWithPrediction = 0;
    let totalMatched = 0;

    for (const studentAttempts of byStudent.values()) {
      let matchIndex: number | null = null;
      let withPrediction = 0;
      let matched = 0;

      studentAttempts.forEach((event, index) => {
        changedValuesFlat.push(...asStringArray(event.payload.changed_values));
        const hasPrediction =
          asFiniteNumber(event.payload.prediction_given) !== null;
        const didMatch = event.payload.result_matched_prediction === true;
        if (hasPrediction) {
          withPrediction += 1;
          totalWithPrediction += 1;
          if (didMatch) {
            matched += 1;
            totalMatched += 1;
          }
        }
        if (didMatch && matchIndex === null) {
          matchIndex = index + 1; // 1-indexado — "na Nª tentativa"
        }
      });

      if (matchIndex !== null) {
        attemptsUntilMatchValues.push(matchIndex);
      }
      if (withPrediction > 0) {
        const ratePercent = (matched / withPrediction) * 100;
        perStudentRates.push(ratePercent);
        scatter.push({
          attempts: studentAttempts.length,
          matchRatePercent: ratePercent,
        });
      }
    }

    return {
      attemptsUntilMatch: describeStats(attemptsUntilMatchValues),
      predictionMatchRate: {
        aggregate: aggregateRate(totalMatched, totalWithPrediction),
        perStudent: summarizePerStudentRates(perStudentRates),
        perStudentHistogram: bucketizePercentRate(perStudentRates),
      },
      mostChangedFieldDistribution: frequencyTable(changedValuesFlat),
      attemptsVsMatchRateScatter: scatter,
    };
  }

  // 3.17 — só chamado quando `expectedModel` existe (ver getChallengeReport
  // acima); o cenário do professor (`scenarioLabel`/`testCases`) é o que
  // dá o rótulo E a lista fixa de casos — mesmo desafio sem NENHUMA
  // submissão ainda aparece com `perCase` completo (submissions: 0), nunca
  // uma lista vazia que esconderia quais casos o cenário define.
  private async buildCreateInsights(
    challengeId: string,
    expectedModel: WaterExpectedModel,
  ): Promise<CreateInsights> {
    const validations =
      await this.eventsService.findWaterProgramValidations(challengeId);
    const byStudent = groupByStudent(validations);

    const perCase = new Map<string, CreateValidationCaseInsight>(
      expectedModel.testCases.map((testCase) => [
        `${testCase.temperatureC}:${testCase.expectedState}`,
        {
          temperatureC: testCase.temperatureC,
          expectedState: testCase.expectedState,
          passes: 0,
          submissions: 0,
        },
      ]),
    );

    const perStudentRates: number[] = [];
    let totalSubmissions = 0;
    let totalAllPassed = 0;

    for (const studentValidations of byStudent.values()) {
      let studentAllPassed = 0;
      for (const event of studentValidations) {
        totalSubmissions += 1;
        if (event.payload.all_passed === true) {
          totalAllPassed += 1;
          studentAllPassed += 1;
        }
        for (const result of asCaseResults(event.payload.case_results)) {
          const tally = perCase.get(
            `${result.temperatureC}:${result.expectedState}`,
          );
          if (!tally) continue; // caso de um `expectedModel` antigo, já trocado
          tally.submissions += 1;
          if (result.passed) tally.passes += 1;
        }
      }
      perStudentRates.push(
        (studentAllPassed / studentValidations.length) * 100,
      );
    }

    return {
      scenarioLabel: expectedModel.scenarioLabel,
      allCasesPassedRate: {
        aggregate: aggregateRate(totalAllPassed, totalSubmissions),
        perStudent: summarizePerStudentRates(perStudentRates),
        perStudentHistogram: bucketizePercentRate(perStudentRates),
      },
      perCase: Array.from(perCase.values()),
    };
  }

  private async buildUseInsights(challengeId: string): Promise<UseInsights> {
    const [completions, executions] = await Promise.all([
      this.eventsService.findUseCompletions(challengeId),
      this.eventsService.findExecutionsWithPrediction(challengeId),
    ]);

    const attemptsBeforeProceedValues = completions
      .map((event) => asFiniteNumber(event.payload.attempts_before_proceed))
      .filter((value): value is number => value !== null);
    const investigationResponses = completions.filter((event) =>
      asNonEmptyString(event.payload.investigation_answer),
    ).length;

    const byStudent = groupByStudent(executions);
    const perStudentRates: number[] = [];
    let totalMatched = 0;

    for (const studentExecutions of byStudent.values()) {
      const matched = studentExecutions.filter(
        (event) => event.payload.result_matched_prediction === true,
      ).length;
      totalMatched += matched;
      perStudentRates.push((matched / studentExecutions.length) * 100);
    }

    return {
      attemptsBeforeProceed: describeStats(attemptsBeforeProceedValues),
      predictionMatchRate: {
        aggregate: aggregateRate(totalMatched, executions.length),
        perStudent: summarizePerStudentRates(perStudentRates),
        perStudentHistogram: bucketizePercentRate(perStudentRates),
      },
      investigationResponses: { n: investigationResponses },
    };
  }
}
