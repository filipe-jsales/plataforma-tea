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
}
