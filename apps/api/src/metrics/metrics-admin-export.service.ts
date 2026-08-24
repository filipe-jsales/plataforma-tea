import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ChallengesService } from '../challenges/challenges.service';
import { InteractionEvent } from '../events/entities/interaction-event.entity';
import { EventsService } from '../events/events.service';
import { SchoolsService } from '../schools/schools.service';
import { ExportEventsQueryDto } from './dto/export-events-query.dto';

const MAX_PERIOD_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ExportEventRow {
  id: string;
  studentPseudoId: string;
  category: string;
  type: string;
  payload: Record<string, unknown>;
  sessionId: string | null;
  challengeId: string | null;
  createdAt: string;
}

export interface ExportResult {
  rows: ExportEventRow[];
  page: number;
  pageSize: number;
  // Verdadeiro quando existe pelo menos mais 1 linha além desta página —
  // calculado pedindo pageSize+1 ao repositório (ver
  // EventsService.findEventsForExport), nunca um COUNT(*) separado.
  hasMore: boolean;
}

function endOfDayUtc(date: Date): Date {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function toExportRow(event: InteractionEvent): ExportEventRow {
  return {
    id: event.id,
    // Nunca nulo na prática: `EventsService.findEventsForExport` já filtra
    // `studentPseudoId IS NOT NULL` (nunca exporta evento de autoria do
    // professor, ver InteractionEvent#teacherUserId) — TypeScript não
    // enxerga essa garantia através do query builder, daí o `!`.
    studentPseudoId: event.studentPseudoId!,
    category: event.category,
    type: event.type,
    payload: event.payload,
    sessionId: event.sessionId,
    challengeId: event.challengeId,
    createdAt: event.createdAt.toISOString(),
  };
}

// 6.6 — exportação de dados brutos pra análise externa (admin/pesquisador).
// Distinto de 6.2/6.5 (agregados prontos): aqui a linha exportada é quase
// a linha crua de `interaction_events` — exatamente as colunas da
// entidade, nunca um join com `users`/`enrollments` que reintroduza
// `displayName` (regra não-negociável 8, mesmo quando quem pede é o
// admin). Quem precisar cruzar pseudônimo↔turma faz isso numa exportação
// separada, não nesta.
@Injectable()
export class MetricsAdminExportService {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly challengesService: ChallengesService,
    private readonly eventsService: EventsService,
    private readonly auditService: AuditService,
  ) {}

  async exportEvents(
    dto: ExportEventsQueryDto,
    adminUserId: string,
  ): Promise<ExportResult> {
    const hasSchool = Boolean(dto.schoolId);
    const hasChallenge = Boolean(dto.challengeId);
    const hasPeriod = Boolean(dto.from || dto.to);

    // AC: "escolhe pelo menos um filtro" — nunca uma exportação da
    // plataforma inteira sem recorte nenhum.
    if (!hasSchool && !hasChallenge && !hasPeriod) {
      throw new BadRequestException(
        'Escolha ao menos um filtro para exportar: escola, desafio ou período.',
      );
    }

    let from: Date | undefined;
    let to: Date | undefined;
    if (hasPeriod) {
      if (!dto.from || !dto.to) {
        throw new BadRequestException(
          'Informe início e fim do período — as duas datas juntas.',
        );
      }
      from = new Date(dto.from);
      to = endOfDayUtc(new Date(dto.to));
      if (to.getTime() < from.getTime()) {
        throw new BadRequestException(
          'O fim do período não pode ser antes do início.',
        );
      }
      // AC: período acima do limite recusa com mensagem clara — nunca
      // trunca silenciosamente nem deixa a query correr contra a tabela
      // inteira.
      const days = (to.getTime() - from.getTime()) / DAY_MS;
      if (days > MAX_PERIOD_DAYS) {
        throw new BadRequestException(
          `O período pedido passa de ${MAX_PERIOD_DAYS} dias — reduza o intervalo e tente de novo.`,
        );
      }
    }

    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 500;
    // "O quê" do log de auditoria — o recorte exatamente como pedido
    // (strings originais do DTO, não os `Date` já normalizados), pra quem
    // ler o log depois reconstituir o pedido literal do admin.
    const filters = {
      schoolId: dto.schoolId ?? null,
      challengeId: dto.challengeId ?? null,
      from: dto.from ?? null,
      to: dto.to ?? null,
      format: dto.format ?? 'json',
      page,
      pageSize,
    };

    let pseudoIds: string[] | undefined;
    if (hasSchool) {
      const school = await this.schoolsService.findSchoolById(dto.schoolId!);
      if (!school) {
        throw new NotFoundException('Escola não encontrada.');
      }
      pseudoIds = await this.schoolsService.findAllStudentPseudoIdsBySchool(
        dto.schoolId!,
      );
      // Escola sem nenhum aluno matriculado (nunca) — resultado vazio
      // legítimo, não um erro; ainda assim é UMA exportação realizada
      // (AC: "toda exportação realizada é registrada"), então audita
      // mesmo sem linha nenhuma.
      if (pseudoIds.length === 0) {
        await this.auditService.recordExport({
          adminUserId,
          filters,
          rowCount: 0,
        });
        return { rows: [], page, pageSize, hasMore: false };
      }
    }

    if (hasChallenge) {
      const challenge = await this.challengesService.findById(dto.challengeId!);
      if (!challenge) {
        throw new NotFoundException('Desafio não encontrado.');
      }
    }

    const events = await this.eventsService.findEventsForExport(
      { pseudoIds, challengeId: dto.challengeId, from, to },
      page,
      pageSize,
    );

    const hasMore = events.length > pageSize;
    const rows = events.slice(0, pageSize).map(toExportRow);

    await this.auditService.recordExport({
      adminUserId,
      filters,
      rowCount: rows.length,
    });

    return { rows, page, pageSize, hasMore };
  }
}
