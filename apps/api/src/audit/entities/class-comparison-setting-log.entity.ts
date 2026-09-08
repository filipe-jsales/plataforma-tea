import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Classroom } from '../../schools/entities/classroom.entity';
import { Role } from '../../common/enums/role.enum';
import { User } from '../../users/entities/user.entity';

// 4.3/7.3 — "toda alteração da comparação entre alunos é auditada (quem,
// quando, ligou/desligou)". Deliberadamente FORA de `interaction_events`,
// mesmo racional de `AdminActionLog`/`ExportAuditLog`: ação de PROFESSOR
// sobre a turma, não uma interação de aluno escopada a `studentPseudoId`
// (NOT NULL naquela tabela) — ver "Padrão: eventos RD-* são escopados ao
// aluno" em docs/ai/modules/backend.md. O card da feature rotula o evento
// como "class_comparison_setting_changed (RD-I)"; a categoria RD-I não se
// aplica aqui (é sobre INTERAÇÃO DE ALUNO), então esta feature segue o
// precedente já estabelecido (log de auditoria dedicado) em vez do rótulo
// literal do card. Append-only, nunca UPDATE/DELETE de um log já gravado.
@Entity('class_comparison_setting_logs')
@Index(['classroomId', 'createdAt'])
export class ClassComparisonSettingLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nullable + ON DELETE SET NULL: defesa em profundidade — turma nunca é
  // hard-deletada no MVP (Classroom é SoftDeletableEntity), então este
  // caminho não é exercitado na prática, mesmo racional de
  // AdminActionLog.actorUserId.
  @Column({ type: 'uuid', nullable: true })
  classroomId: string | null;

  @ManyToOne(() => Classroom, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'classroomId' })
  classroom: Classroom | null;

  @Column({ type: 'boolean' })
  enabled: boolean;

  @Column({ type: 'uuid', nullable: true })
  changedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changedByUserId' })
  changedBy: User | null;

  @Column({ type: 'enum', enum: Role })
  changedByRole: Role;

  @CreateDateColumn()
  createdAt: Date;
}
