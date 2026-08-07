import { Injectable } from '@nestjs/common';
import { ChallengeStage } from '../challenges/challenge-config.interface';
import { EventsService } from '../events/events.service';

export type ChallengeStatus = 'not_started' | 'in_progress' | 'completed';

export interface ChallengeProgress {
  status: ChallengeStatus;
  attempts: number;
}

export interface ChallengeProgressParams {
  challengeId: string;
  stage: ChallengeStage;
  // Só usado (e só faz diferença) pra `stage: 'modify'` — ver
  // resolveCompletedStudents. `null` quando o desafio `modify` é o último
  // cadastrado no tópico (não existe um `create` seguinte ainda).
  nextChallengeId: string | null;
}

// Evento de conclusão por estágio — `modify` de propósito não tem entrada
// aqui, ver resolveCompletedStudents.
const COMPLETION_EVENT_TYPE_BY_STAGE: Partial<Record<ChallengeStage, string>> = {
  use: 'challenge_use_completed',
  create: 'challenge.completed',
};

// 6.1 — motor único de cálculo de status/progresso. Nenhuma tela consulta
// `interaction_events` diretamente pra responder "em que ponto esse aluno
// está?" — todas passam por aqui, pra nunca divergir entre a tela do
// professor e a do admin pro mesmo recorte de alunos (AC de 6.1).
@Injectable()
export class MetricsService {
  constructor(private readonly eventsService: EventsService) {}

  // `pseudoIds` é sempre um recorte pré-filtrado pelo chamador (turma,
  // escola) — este serviço nunca varre "todos os alunos da plataforma" por
  // padrão (AC de 6.1).
  async getChallengeProgressForStudents(
    pseudoIds: string[],
    params: ChallengeProgressParams,
  ): Promise<Map<string, ChallengeProgress>> {
    const progress = new Map<string, ChallengeProgress>();
    if (pseudoIds.length === 0) {
      return progress;
    }

    const [attempts, completedIds] = await Promise.all([
      this.eventsService.countAttemptsByStudents(pseudoIds, params.challengeId),
      this.resolveCompletedStudents(pseudoIds, params),
    ]);

    for (const pseudoId of pseudoIds) {
      const attemptCount = attempts.get(pseudoId) ?? 0;
      const status: ChallengeStatus = completedIds.has(pseudoId)
        ? 'completed'
        : attemptCount > 0
          ? 'in_progress'
          : 'not_started';
      progress.set(pseudoId, { status, attempts: attemptCount });
    }
    return progress;
  }

  private resolveCompletedStudents(
    pseudoIds: string[],
    params: ChallengeProgressParams,
  ): Promise<Set<string>> {
    // Fase Modify (3.4) nunca tem um evento de "concluído" próprio, de
    // propósito — essa fase não avalia certo/errado (regra não-negociável
    // 4), só registra tentativas (`challenge_modify_attempt`). "Concluído"
    // aqui é DERIVADO, não instrumentado: um aluno "saiu" do Modify quando
    // tem qualquer evento no desafio seguinte (Create) da mesma sequência
    // Use→Modify→Create — não é uma constatação de sucesso na tentativa,
    // só de que ele seguiu em frente. `attempts` continua sendo o dado
    // pedagogicamente relevante desta fase (quanto o aluno explorou), não
    // um binário completou/não completou.
    if (params.stage === 'modify') {
      if (!params.nextChallengeId) {
        return Promise.resolve(new Set());
      }
      return this.eventsService.findStudentsWithEvent(pseudoIds, params.nextChallengeId);
    }

    const completionType = COMPLETION_EVENT_TYPE_BY_STAGE[params.stage];
    if (!completionType) {
      return Promise.resolve(new Set());
    }
    return this.eventsService.findStudentsWithEvent(pseudoIds, params.challengeId, completionType);
  }
}
