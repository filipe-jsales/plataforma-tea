import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Challenge } from '../../challenges/entities/challenge.entity';
import { Classroom } from '../../schools/entities/classroom.entity';
import { User } from '../../users/entities/user.entity';

// 4.3 — vínculo desafio↔turma: tabela de associação N:N (um desafio pode
// ser alocado a várias turmas, uma turma pode ter vários desafios
// alocados) — a cardinalidade N:N pedida pela AC já é a forma natural de
// uma tabela de associação, não uma concessão especial. O MVP só valida o
// cenário 1 turma por desafio na UI/testes, mas o schema não impõe isso.
//
// Sem um desafio ser alocado a nenhuma turma, ele não aparece pra nenhum
// aluno — `findAvailableForStudent` (ChallengeAllocationsService) só
// devolve desafio com uma linha aqui pra turma ativa do aluno.
@Entity('challenge_classroom_allocations')
@Index(['challengeId', 'classroomId'], { unique: true })
export class ChallengeClassroomAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  challengeId: string;

  @ManyToOne(() => Challenge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challengeId' })
  challenge: Challenge;

  @Column({ type: 'uuid' })
  classroomId: string;

  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classroomId' })
  classroom: Classroom;

  // Quem alocou — AC7 pede "professor_id" no log de alocação (RD-C). Este
  // é o registro em si (ver nota em ChallengeAllocationsService sobre por
  // que isto NÃO vira uma linha de `interaction_events`), então nullable +
  // `ON DELETE SET NULL` (mesma defesa em profundidade de
  // ExportAuditLog.adminUserId) preserva o vínculo desafio↔turma mesmo se
  // a conta do professor for removida no futuro.
  @Column({ type: 'uuid', nullable: true })
  allocatedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'allocatedByUserId' })
  allocatedBy: User | null;

  @CreateDateColumn()
  allocatedAt: Date;
}
