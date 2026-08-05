import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EventCategory } from '../../common/enums/event-category.enum';

// Tabela append-only: eventos nunca são atualizados ou apagados, apenas inseridos.
// Sustenta os RQ5 do mapeamento (ausência de instrumento padronizado de avaliação de CT
// e escassez de estudos longitudinais) — cada interação relevante é capturada desde já.
@Entity('interaction_events')
@Index(['studentPseudoId', 'createdAt'])
@Index(['challengeId'])
export class InteractionEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nunca o id reversível do aluno — sempre o pseudônimo.
  @Column({ type: 'varchar', length: 64 })
  studentPseudoId: string;

  @Column({ type: 'enum', enum: EventCategory })
  category: EventCategory;

  // Ex.: "block.snap", "block.detach", "challenge.predict", "challenge.run",
  // "curricular.answer.correct", "session.idle" — vocabulário controlado, definido
  // por feature, nunca texto livre vindo do front.
  @Column({ type: 'varchar', length: 80 })
  type: string;

  // Payload estruturado específico do evento (ex.: blockId, xmlSnapshot, latencyMs).
  // Nunca contém interpretação clínica (ver regra não-negociável 7).
  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  // ID da sessão de desafio/atividade, para reconstrução do ciclo PRIMM completo.
  @Column({ type: 'varchar', length: 64, nullable: true })
  sessionId: string | null;

  // Sem FK ainda — a entidade Challenge (desafio) não existe neste MVP.
  // Coluna já modelada para não exigir migration destrutiva quando o módulo
  // de desafios for implementado; vira FK real nesse momento.
  @Column({ type: 'uuid', nullable: true })
  challengeId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
