import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Challenge } from '../../challenges/entities/challenge.entity';
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

  // Nunca o id reversível do aluno — sempre o pseudônimo. `null` só nos
  // poucos eventos de AUTORIA do professor (ver `teacherUserId` abaixo) —
  // um evento de aluno de verdade sempre tem os dois preenchidos
  // exclusivamente entre si, nunca os dois juntos nem os dois nulos
  // (responsabilidade de `EventsService.record`/`recordTeacherEvent`, não
  // de uma constraint de banco).
  @Column({ type: 'varchar', length: 64, nullable: true })
  studentPseudoId: string | null;

  // 7.5 — id real (não pseudonimizado) do professor autor, só presente em
  // eventos de AUTORIA de currículo (ex.: `challenge_primm_questions_
  // configured`), nunca em telemetria de interação do aluno. Coluna
  // separada de propósito: professor/admin não são pseudonimizados (regra
  // não-negociável 8 só se aplica a dado de ALUNO) — misturar o id real do
  // professor dentro de `studentPseudoId` contaminaria qualquer contagem/
  // exportação que assume "toda linha desta tabela = 1 pseudônimo de
  // aluno" (ex.: `countDistinctStudentsActiveSince`, exportação 6.6).
  @Column({ type: 'uuid', nullable: true })
  teacherUserId: string | null;

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

  // Nullable: nem todo evento é escopado a um desafio (ex.: login, navegação).
  @Column({ type: 'uuid', nullable: true })
  challengeId: string | null;

  @ManyToOne(() => Challenge, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'challengeId' })
  challenge: Challenge | null;

  @CreateDateColumn()
  createdAt: Date;
}
