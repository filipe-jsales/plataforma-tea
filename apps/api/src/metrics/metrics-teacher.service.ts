import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChallengeStage, isChallengeConfig } from '../challenges/challenge-config.interface';
import { ChallengesService } from '../challenges/challenges.service';
import { Challenge } from '../challenges/entities/challenge.entity';
import { EventsService } from '../events/events.service';
import { SchoolsService } from '../schools/schools.service';
import { SubjectsService } from '../subjects/subjects.service';
import { ChallengeProgress, ChallengeStatus, MetricsService } from './metrics.service';

export interface StudentChallengeProgress {
  challengeId: string;
  title: string;
  stage: ChallengeStage;
  status: ChallengeStatus;
  attempts: number;
}

export interface StudentProgressOverview {
  studentPseudoId: string;
  displayName: string;
  enrolledAt: Date;
  challenges: StudentChallengeProgress[];
}

export interface ClassroomStageBreakdown {
  stage: ChallengeStage;
  studentsCompleted: number;
  studentsInProgress: number;
  studentsNotStarted: number;
}

export interface ClassroomSummary {
  totalStudents: number;
  activeStudentsToday: number;
  byStage: ClassroomStageBreakdown[];
  // Taxa de uso do botão de Ajuda no estágio `create`, 0-100 — número puro,
  // nunca rotulado como "dificuldade" (regra não-negociável 7: RD-E jamais
  // vira inferência clínica/pedagógica na resposta da API).
  helpButtonUsageRate: number;
}

interface ChallengeStep {
  challengeId: string;
  title: string;
  stage: ChallengeStage;
  nextChallengeId: string | null;
}

const ALL_STAGES: ChallengeStage[] = ['use', 'modify', 'create'];

// 6.3/6.4 — painel do professor. Reaproveita o motor 6.1 (MetricsService)
// pra status/tentativas por desafio, escopado sempre pelos alunos
// matriculados ativos da turma do professor autenticado — nunca a escola
// inteira, nunca outro professor (ver assertOwnClassroom).
@Injectable()
export class MetricsTeacherService {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly subjectsService: SubjectsService,
    private readonly challengesService: ChallengesService,
    private readonly eventsService: EventsService,
    private readonly metricsService: MetricsService,
  ) {}

  // 6.3 — progresso por aluno da própria turma na sequência Use→Modify→
  // Create de todo desafio disponível. Ordenação default por `enrolledAt`
  // (matrícula) — nunca por desempenho (regra não-negociável 5); reordenar
  // por nome/desempenho é decisão de tela, não deste endpoint.
  async getStudentsProgress(classroomId: string, teacherId: string): Promise<StudentProgressOverview[]> {
    await this.assertOwnClassroom(classroomId, teacherId);

    const [enrollments, steps] = await Promise.all([
      this.schoolsService.findActiveStudentsInClassroom(classroomId),
      this.loadChallengeSequence(),
    ]);
    const sortedEnrollments = [...enrollments].sort(
      (a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime(),
    );
    const pseudoIds = sortedEnrollments.map((enrollment) => enrollment.student.pseudonymId);
    const progressByChallenge = await this.computeProgressByChallenge(pseudoIds, steps);

    return sortedEnrollments.map((enrollment) => {
      const pseudoId = enrollment.student.pseudonymId;
      return {
        studentPseudoId: pseudoId,
        displayName: enrollment.student.displayName,
        enrolledAt: enrollment.enrolledAt,
        challenges: steps.map((step) => {
          const progress = progressByChallenge.get(step.challengeId)?.get(pseudoId) ?? {
            status: 'not_started' as ChallengeStatus,
            attempts: 0,
          };
          return {
            challengeId: step.challengeId,
            title: step.title,
            stage: step.stage,
            status: progress.status,
            attempts: progress.attempts,
          };
        }),
      };
    });
  }

  // 6.4 — visão agregada: totais e distribuição por estágio, sem nenhum
  // nome de aluno (AC de 6.4 — detalhe individual é sempre 6.3).
  async getClassroomSummary(classroomId: string, teacherId: string): Promise<ClassroomSummary> {
    await this.assertOwnClassroom(classroomId, teacherId);

    const [enrollments, steps] = await Promise.all([
      this.schoolsService.findActiveStudentsInClassroom(classroomId),
      this.loadChallengeSequence(),
    ]);
    const pseudoIds = enrollments.map((enrollment) => enrollment.student.pseudonymId);
    const totalStudents = pseudoIds.length;

    if (totalStudents === 0) {
      // Turma sem aluno ativo: zeros explícitos, nunca divisão por zero nem
      // erro (AC de 6.4).
      return {
        totalStudents: 0,
        activeStudentsToday: 0,
        byStage: ALL_STAGES.map((stage) => ({
          stage,
          studentsCompleted: 0,
          studentsInProgress: 0,
          studentsNotStarted: 0,
        })),
        helpButtonUsageRate: 0,
      };
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [progressByChallenge, activeStudentsToday, helpUsers] = await Promise.all([
      this.computeProgressByChallenge(pseudoIds, steps),
      this.eventsService.countDistinctStudentsActiveSince(pseudoIds, startOfToday),
      this.countHelpButtonUsers(pseudoIds, steps),
    ]);

    return {
      totalStudents,
      activeStudentsToday,
      byStage: ALL_STAGES.map((stage) => this.buildStageBreakdown(stage, steps, progressByChallenge)),
      helpButtonUsageRate: Math.round((helpUsers.size / totalStudents) * 100),
    };
  }

  private async assertOwnClassroom(classroomId: string, teacherId: string): Promise<void> {
    const classroom = await this.schoolsService.findClassroomById(classroomId);
    if (!classroom) {
      throw new NotFoundException('Turma não encontrada.');
    }
    // AC de 6.3: mesmo manipulando a URL, professor nunca acessa turma que
    // não é sua — mesma escola ou não.
    if (classroom.teacherId !== teacherId) {
      throw new ForbiddenException('Você não é o professor titular desta turma.');
    }
  }

  private buildStageBreakdown(
    stage: ChallengeStage,
    steps: ChallengeStep[],
    progressByChallenge: Map<string, Map<string, ChallengeProgress>>,
  ): ClassroomStageBreakdown {
    const breakdown: ClassroomStageBreakdown = {
      stage,
      studentsCompleted: 0,
      studentsInProgress: 0,
      studentsNotStarted: 0,
    };
    for (const step of steps) {
      if (step.stage !== stage) continue;
      const progress = progressByChallenge.get(step.challengeId);
      if (!progress) continue;
      for (const { status } of progress.values()) {
        if (status === 'completed') breakdown.studentsCompleted += 1;
        else if (status === 'in_progress') breakdown.studentsInProgress += 1;
        else breakdown.studentsNotStarted += 1;
      }
    }
    return breakdown;
  }

  private async countHelpButtonUsers(pseudoIds: string[], steps: ChallengeStep[]): Promise<Set<string>> {
    const createSteps = steps.filter((step) => step.stage === 'create');
    const usersByStep = await Promise.all(
      createSteps.map((step) =>
        this.eventsService.findStudentsWithEvent(pseudoIds, step.challengeId, 'challenge.help_viewed'),
      ),
    );
    const users = new Set<string>();
    for (const stepUsers of usersByStep) {
      for (const pseudoId of stepUsers) users.add(pseudoId);
    }
    return users;
  }

  private async computeProgressByChallenge(
    pseudoIds: string[],
    steps: ChallengeStep[],
  ): Promise<Map<string, Map<string, ChallengeProgress>>> {
    const entries = await Promise.all(
      steps.map(
        async (step) =>
          [
            step.challengeId,
            await this.metricsService.getChallengeProgressForStudents(pseudoIds, {
              challengeId: step.challengeId,
              stage: step.stage,
              nextChallengeId: step.nextChallengeId,
            }),
          ] as const,
      ),
    );
    return new Map(entries);
  }

  // Todo desafio disponível, de todo tópico, na ordem Use→Modify→Create —
  // mesma fonte que ChallengesController usa pra `nextChallengeId`, aqui
  // reconstruída por tópico pra não misturar a sequência de um tópico com a
  // de outro.
  private async loadChallengeSequence(): Promise<ChallengeStep[]> {
    const topics = await this.subjectsService.findAllTopics();
    const sequencesByTopic = await Promise.all(
      topics.map((topic) => this.challengesService.findByTopicIdOrdered(topic.id)),
    );

    const steps: ChallengeStep[] = [];
    for (const challenges of sequencesByTopic) {
      challenges.forEach((challenge: Challenge, index) => {
        if (!isChallengeConfig(challenge.config)) {
          // Desafio cadastrado mas ainda sem toolbox configurada — nada pra
          // mostrar no painel ainda (mesmo estado que ChallengesController
          // trata como "conteúdo incompleto").
          return;
        }
        steps.push({
          challengeId: challenge.id,
          title: challenge.title,
          stage: challenge.config.stage,
          nextChallengeId: challenges[index + 1]?.id ?? null,
        });
      });
    }
    return steps;
  }
}
