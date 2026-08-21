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
  async countDistinctStudentsActiveSince(
    pseudoIds: string[],
    since: Date,
  ): Promise<number> {
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
    return this.eventsRepository.count({
      where: { studentPseudoId, category, type },
    });
  }

  // Motor de status/progresso (6.1) — quantas vezes cada aluno do recorte
  // executou este desafio (`program_executed`, RD-P). Uma query agrupada,
  // não N+1: `pseudoIds` já vem pré-filtrado pelo chamador (turma/escola),
  // nunca "todos os alunos" (AC de 6.1).
  async countAttemptsByStudents(
    pseudoIds: string[],
    challengeId: string,
  ): Promise<Map<string, number>> {
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
  async findStudentsWithEvent(
    pseudoIds: string[],
    challengeId: string,
    type?: string,
  ): Promise<Set<string>> {
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

  // Relatório de profundidade por desafio (6.5) — daqui pra baixo, sem
  // `pseudoIds` pré-filtrado de propósito: é a plataforma inteira (visão de
  // pesquisa do admin), não escopado a turma/escola. Nunca vaza
  // displayName — só pseudônimo, contagem e payload já estruturado, mesmo
  // padrão do resto do módulo.

  // Todo aluno que teve QUALQUER evento neste desafio — "N que chegou até
  // ele" (AC de 6.5). População-base do relatório inteiro: as demais
  // consultas abaixo recebem este conjunto como `pseudoIds`.
  async findDistinctStudentsForChallenge(
    challengeId: string,
  ): Promise<string[]> {
    const rows = await this.eventsRepository
      .createQueryBuilder('event')
      .select('DISTINCT event.studentPseudoId', 'studentPseudoId')
      .where('event.challengeId = :challengeId', { challengeId })
      .getRawMany<{ studentPseudoId: string }>();
    return rows.map((row) => row.studentPseudoId);
  }

  // Primeiro timestamp por aluno neste desafio — sem `type`, é "quando o
  // aluno chegou" (ex.: toolbox_rendered ao carregar a tela); com `type`,
  // "quando o aluno fez X pela 1ª vez" (ex.: program_executed). A diferença
  // entre os dois é "tempo até a primeira execução" (AC de 6.5), calculada
  // em código por MetricsAdminChallengeService — não em SQL, mesma decisão
  // do resto deste bloco.
  async findEarliestEventTimestamps(
    challengeId: string,
    type?: string,
  ): Promise<Map<string, Date>> {
    const query = this.eventsRepository
      .createQueryBuilder('event')
      .select('event.studentPseudoId', 'studentPseudoId')
      .addSelect('MIN(event.createdAt)', 'earliest')
      .where('event.challengeId = :challengeId', { challengeId })
      .groupBy('event.studentPseudoId');
    if (type) {
      query.andWhere('event.type = :type', { type });
    }
    const rows = await query.getRawMany<{
      studentPseudoId: string;
      earliest: Date;
    }>();
    return new Map(
      rows.map((row) => [row.studentPseudoId, new Date(row.earliest)]),
    );
  }

  // Contagem bruta por categoria RD-* (AC de 6.5) — preenche as 5
  // categorias mesmo quando uma delas não tem nenhum evento ainda (0
  // explícito, nunca uma chave ausente que o frontend precisaria tratar
  // como "talvez seja 0, talvez não exista").
  async countEventsByCategoryForChallenge(
    challengeId: string,
  ): Promise<Record<EventCategory, number>> {
    const rows = await this.eventsRepository
      .createQueryBuilder('event')
      .select('event.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('event.challengeId = :challengeId', { challengeId })
      .groupBy('event.category')
      .getRawMany<{ category: EventCategory; count: string }>();
    const result = Object.fromEntries(
      Object.values(EventCategory).map((category) => [category, 0]),
    ) as Record<EventCategory, number>;
    for (const row of rows) {
      result[row.category] = Number(row.count);
    }
    return result;
  }

  // Contagem bruta por `type` específico (AC de 6.5) — ordenado por
  // contagem desc pra já sair pronto pro gráfico de barras, empate por tipo
  // asc pra saída determinística.
  async countEventsByTypeForChallenge(
    challengeId: string,
  ): Promise<{ type: string; count: number }[]> {
    const rows = await this.eventsRepository
      .createQueryBuilder('event')
      .select('event.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('event.challengeId = :challengeId', { challengeId })
      .groupBy('event.type')
      .getRawMany<{ type: string; count: string }>();
    return rows
      .map((row) => ({ type: row.type, count: Number(row.count) }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  }

  // Linhas brutas de `challenge_modify_attempt` (payload incluso), em ordem
  // cronológica por aluno — quem interpreta `changed_values`/
  // `prediction_given`/`result_matched_prediction` é
  // MetricsAdminChallengeService (decisão técnica de 6.5: cálculo em
  // código, não em SQL agregado).
  findModifyAttempts(challengeId: string): Promise<InteractionEvent[]> {
    return this.eventsRepository.find({
      where: { challengeId, type: 'challenge_modify_attempt' },
      order: { studentPseudoId: 'ASC', createdAt: 'ASC' },
    });
  }

  // Linhas brutas de `program_executed` que carregam campos de previsão
  // (`prediction_given`/`result_matched_prediction`) — só a fase `use` loga
  // isso (a fase `modify` tem `challenge_modify_attempt` própria, ver
  // findModifyAttempts). `payload->>'prediction_given' IS NOT NULL` em vez
  // do operador `?` de existência de chave jsonb, pra não arriscar
  // ambiguidade com o parser de parâmetros nomeados do TypeORM.
  findExecutionsWithPrediction(
    challengeId: string,
  ): Promise<InteractionEvent[]> {
    return this.eventsRepository
      .createQueryBuilder('event')
      .where('event.challengeId = :challengeId', { challengeId })
      .andWhere('event.type = :type', { type: 'program_executed' })
      .andWhere(`event.payload ->> 'prediction_given' IS NOT NULL`)
      .orderBy('event.studentPseudoId', 'ASC')
      .getMany();
  }

  // Linhas brutas de `challenge_use_completed`, só a cópia RD-P (a que
  // carrega `attempts_before_proceed`/`investigation_answer` — a cópia RD-C
  // é só bookkeeping curricular, contá-la junto duplicaria o N).
  findUseCompletions(challengeId: string): Promise<InteractionEvent[]> {
    return this.eventsRepository.find({
      where: {
        challengeId,
        type: 'challenge_use_completed',
        category: EventCategory.PRODUCT,
      },
      order: { studentPseudoId: 'ASC' },
    });
  }

  // Linhas brutas de `water_program_validated` (3.17, RD-C) — resultado da
  // validação do backend contra o `expectedModel` do desafio 2.3. Só
  // gravado pelo `ChallengeValidationService` (nunca pelo frontend
  // diretamente, ao contrário do resto deste arquivo), lido só pelo
  // relatório do professor (MetricsAdminChallengeService).
  findWaterProgramValidations(
    challengeId: string,
  ): Promise<InteractionEvent[]> {
    return this.eventsRepository.find({
      where: { challengeId, type: 'water_program_validated' },
      order: { studentPseudoId: 'ASC', createdAt: 'ASC' },
    });
  }

  // 6.6 — exportação de dados brutos pra pesquisa externa. Filtros são
  // opcionais e combináveis (AND) — quem chama (MetricsAdminExportService)
  // já garantiu que ao menos um está presente antes de chegar aqui, essa
  // regra não é responsabilidade da query. `pseudoIds` vem pré-resolvido
  // (escola → alunos matriculados, ver SchoolsService) — esta função nunca
  // faz join com `users`/`enrollments` diretamente, pra não arriscar
  // reintroduzir `displayName` no resultado (regra não-negociável 8: nunca
  // um join que reintroduza identidade real).
  //
  // Pede `pageSize + 1` linhas de propósito: o chamador usa a linha extra
  // só pra saber se existe mais uma página (`hasMore`), sem precisar de um
  // segundo `COUNT(*)` — descartada antes de virar resposta.
  findEventsForExport(
    filter: {
      pseudoIds?: string[];
      challengeId?: string;
      from?: Date;
      to?: Date;
    },
    page: number,
    pageSize: number,
  ): Promise<InteractionEvent[]> {
    const query = this.eventsRepository
      .createQueryBuilder('event')
      .orderBy('event.createdAt', 'ASC')
      .addOrderBy('event.id', 'ASC');
    if (filter.pseudoIds) {
      query.andWhere('event.studentPseudoId IN (:...pseudoIds)', {
        pseudoIds: filter.pseudoIds,
      });
    }
    if (filter.challengeId) {
      query.andWhere('event.challengeId = :challengeId', {
        challengeId: filter.challengeId,
      });
    }
    if (filter.from) {
      query.andWhere('event.createdAt >= :from', { from: filter.from });
    }
    if (filter.to) {
      query.andWhere('event.createdAt <= :to', { to: filter.to });
    }
    return query
      .skip((page - 1) * pageSize)
      .take(pageSize + 1)
      .getMany();
  }
}
