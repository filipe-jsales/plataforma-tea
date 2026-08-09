import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { User } from '../../users/entities/user.entity';

// 1.4 — CRUD de usuários (admin): "toda alteração de papel ou status é
// auditada (quem, quando, o quê)". Deliberadamente FORA de
// `interaction_events` (mesmo raciocínio de `ExportAuditLog`, 6.6): esta é
// telemetria operacional de STAFF sobre outro usuário (que pode ser um
// professor/admin, sem `studentPseudoId` nenhum na maioria dos casos), não
// um evento RD-* escopado a aluno — ver "Padrão: eventos RD-* são
// escopados ao aluno" em docs/ai/modules/backend.md. Append-only, mesma
// filosofia de `interaction_events`/`export_audit_logs`: nunca
// UPDATE/DELETE de um log já gravado.
@Entity('admin_action_logs')
@Index(['actorUserId', 'createdAt'])
export class AdminActionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nullable + ON DELETE SET NULL: defesa em profundidade (não existe hard
  // delete de usuário no MVP, então este caminho não é exercitado na
  // prática — mesmo racional de ExportAuditLog.adminUserId).
  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actorUserId' })
  actor: User | null;

  @Column({ type: 'enum', enum: Role })
  actorRole: Role;

  // create | edit | activate | deactivate — vocabulário controlado pelo
  // service, nunca texto livre vindo de fora.
  @Column({ type: 'varchar', length: 40 })
  actionType: string;

  @Column({ type: 'uuid', nullable: true })
  targetUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'targetUserId' })
  target: User | null;

  @Column({ type: 'enum', enum: Role })
  targetRole: Role;

  // Detalhe do "o quê" (ex.: campos alterados) — estrutura livre, mesmo
  // raciocínio de InteractionEvent.payload/ExportAuditLog.filters.
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
