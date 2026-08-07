import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventCategory } from '../common/enums/event-category.enum';
import { CreateEventDto } from './dto/create-event.dto';
import { InteractionEvent } from './entities/interaction-event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(InteractionEvent)
    private readonly eventsRepository: Repository<InteractionEvent>,
  ) {}

  async record(dto: CreateEventDto): Promise<InteractionEvent> {
    const event = this.eventsRepository.create({
      studentPseudoId: dto.studentPseudoId,
      category: dto.category,
      type: dto.type,
      payload: dto.payload ?? {},
      sessionId: dto.sessionId ?? null,
      challengeId: dto.challengeId ?? null,
    });
    return this.eventsRepository.save(event);
  }

  // Home do professor (2.1): sinal de engajamento neutro por turma — nunca
  // ranking individual, só a contagem de alunos com pelo menos 1 evento
  // desde `since`. Se `pseudoIds` vier vazio (turma sem aluno matriculado),
  // não faz sentido montar a query.
  async countDistinctStudentsActiveSince(pseudoIds: string[], since: Date): Promise<number> {
    if (pseudoIds.length === 0) {
      return 0;
    }
    const raw = await this.eventsRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.studentPseudoId)', 'count')
      .where('event.studentPseudoId IN (:...pseudoIds)', { pseudoIds })
      .andWhere('event.createdAt >= :since', { since })
      .getRawOne<{ count: string }>();
    return Number(raw?.count ?? 0);
  }

  // Home do aluno (2.1): "meu progresso" — contagem de desafios concluídos
  // pelo próprio aluno, nunca comparado a outros alunos.
  countByStudentCategoryType(
    studentPseudoId: string,
    category: EventCategory,
    type: string,
  ): Promise<number> {
    return this.eventsRepository.count({ where: { studentPseudoId, category, type } });
  }

  // Motor de status/progresso (6.1) — quantas vezes cada aluno do recorte
  // executou este desafio (`program_executed`, RD-P). Uma query agrupada,
  // não N+1: `pseudoIds` já vem pré-filtrado pelo chamador (turma/escola),
  // nunca "todos os alunos" (AC de 6.1).
  async countAttemptsByStudents(pseudoIds: string[], challengeId: string): Promise<Map<string, number>> {
    if (pseudoIds.length === 0) {
      return new Map();
    }
    const rows = await this.eventsRepository
      .createQueryBuilder('event')
      .select('event.studentPseudoId', 'studentPseudoId')
      .addSelect('COUNT(*)', 'count')
      .where('event.studentPseudoId IN (:...pseudoIds)', { pseudoIds })
      .andWhere('event.challengeId = :challengeId', { challengeId })
      .andWhere('event.type = :type', { type: 'program_executed' })
      .groupBy('event.studentPseudoId')
      .getRawMany<{ studentPseudoId: string; count: string }>();
    return new Map(rows.map((row) => [row.studentPseudoId, Number(row.count)]));
  }

  // Motor de status/progresso (6.1) — quais alunos do recorte têm pelo
  // menos 1 evento nesse desafio, opcionalmente restrito a um `type`. Sem
  // `type`, é "teve qualquer atividade nesse desafio" — usado pra derivar
  // "saiu da fase Modify" a partir do primeiro evento no desafio Create
  // seguinte, sem precisar de um evento de conclusão próprio (ver
  // MetricsService.getChallengeProgressForStudents).
  async findStudentsWithEvent(pseudoIds: string[], challengeId: string, type?: string): Promise<Set<string>> {
    if (pseudoIds.length === 0) {
      return new Set();
    }
    const query = this.eventsRepository
      .createQueryBuilder('event')
      .select('DISTINCT event.studentPseudoId', 'studentPseudoId')
      .where('event.studentPseudoId IN (:...pseudoIds)', { pseudoIds })
      .andWhere('event.challengeId = :challengeId', { challengeId });
    if (type) {
      query.andWhere('event.type = :type', { type });
    }
    const rows = await query.getRawMany<{ studentPseudoId: string }>();
    return new Set(rows.map((row) => row.studentPseudoId));
  }
}
