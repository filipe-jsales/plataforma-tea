import { Injectable } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { MinigamesService } from '../minigames/minigames.service';
import type { MiniGameStage } from '../minigames/mini-game-level-config.interface';
import { EventCategory } from '../common/enums/event-category.enum';
import { SettingsService } from '../settings/settings.service';
import { DescriptiveStats, FrequencyBucket, RateSummary, aggregateRate, bucketizeAttempts, describeStats } from './statistics';

export interface MiniGameLevelPickerOption {
  id: string;
  title: string;
  stage: MiniGameStage;
  conceptId: string;
}

export interface MiniGameLevelDepthReport {
  levelId: string;
  title: string;
  stage: MiniGameStage;
  conceptId: string;
  minSampleSizeThreshold: number;
  studentsReached: number;
  studentsCompleted: number;
  roundsPerStudent: DescriptiveStats;
  roundsHistogram: FrequencyBucket[];
  timeToFirstExecutionMs: DescriptiveStats;
  eventsByCategory: Record<EventCategory, number>;
  eventsByType: FrequencyBucket[];
  // RD-E — engajamento-proxy, dado bruto (regra não-negociável 7): quantos
  // alunos abandonaram a rodada ainda ativa, nunca interpretado como
  // "dificuldade"/"sobrecarga" nesta camada nem em nenhuma tela.
  abandonmentCount: number;
  // Quantos alunos, entre os que chegaram, responderam a pergunta de
  // predição opcional (nunca obrigatória — regra de MJ1/PRIMM).
  predictAnswerRate: RateSummary;
}

// Espelha MetricsAdminChallengeService (6.5), mesmo padrão de orquestração:
// busca valores brutos por aluno (EventsService, métodos *ForMiniGameLevel)
// e delega todo cálculo estatístico a statistics.ts — reaproveitado
// integralmente, nenhuma fórmula duplicada. Métrica pedida explicitamente
// pelo produto: "admin recebe as métricas dos eventos dos alunos" pro mini
// jogo, mesmo nível de profundidade já dado ao desafio de blocos.
@Injectable()
export class MetricsAdminMiniGameService {
  constructor(
    private readonly minigamesService: MinigamesService,
    private readonly eventsService: EventsService,
    private readonly settingsService: SettingsService,
  ) {}

  async listMiniGameLevels(): Promise<MiniGameLevelPickerOption[]> {
    const levels = await this.minigamesService.findAll();
    return levels.map((level) => ({
      id: level.id,
      title: level.title,
      stage: level.stage,
      conceptId: level.conceptId,
    }));
  }

  async getMiniGameLevelReport(levelId: string): Promise<MiniGameLevelDepthReport> {
    const level = await this.minigamesService.findOneOrThrow(levelId);

    const reachedPseudoIds =
      await this.eventsService.findDistinctStudentsForMiniGameLevel(levelId);

    const [
      settings,
      earliestAnyEvent,
      earliestExecution,
      eventsByCategory,
      eventsByTypeRaw,
      roundsByStudent,
      completions,
      abandonments,
      predictAnswers,
    ] = await Promise.all([
      this.settingsService.getOrCreate(),
      this.eventsService.findEarliestMiniGameEventTimestamps(levelId),
      this.eventsService.findEarliestMiniGameEventTimestamps(
        levelId,
        'minigame_round_executed',
      ),
      this.eventsService.countEventsByCategoryForMiniGameLevel(levelId),
      this.eventsService.countEventsByTypeForMiniGameLevel(levelId),
      this.eventsService.countAttemptsByStudentsForMiniGameLevel(
        reachedPseudoIds,
        levelId,
      ),
      this.eventsService.findMiniGameCompletions(levelId),
      this.eventsService.findMiniGameAbandonments(levelId),
      this.eventsService.findMiniGamePredictAnswers(levelId),
    ]);

    const roundsValues = Array.from(roundsByStudent.values());

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

    const studentsCompleted = new Set(
      completions.map((event) => event.studentPseudoId).filter((id): id is string => !!id),
    ).size;

    const predictAnswerStudents = new Set(
      predictAnswers.map((event) => event.studentPseudoId).filter((id): id is string => !!id),
    ).size;

    return {
      levelId: level.id,
      title: level.title,
      stage: level.stage,
      conceptId: level.conceptId,
      minSampleSizeThreshold: settings.minSampleSizeThreshold,
      studentsReached: reachedPseudoIds.length,
      studentsCompleted,
      roundsPerStudent: describeStats(roundsValues),
      roundsHistogram: bucketizeAttempts(roundsValues),
      timeToFirstExecutionMs: describeStats(timeToFirstExecutionMs),
      eventsByCategory,
      eventsByType,
      abandonmentCount: abandonments.length,
      predictAnswerRate: aggregateRate(predictAnswerStudents, reachedPseudoIds.length),
    };
  }
}
