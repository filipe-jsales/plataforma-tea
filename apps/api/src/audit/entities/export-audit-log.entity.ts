import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// 6.6 — primeiro registro de auditoria de admin/professor do projeto (não
// existia tabela nenhuma pra isso antes). Deliberadamente FORA de
// `interaction_events`: aquela tabela é escopada a aluno (RD-I/P/C/E/L,
// studentPseudoId NOT NULL, ver "Padrão: eventos RD-* são escopados ao
// aluno" em backend.md) — isto é telemetria operacional de STAFF (quem
// exportou o quê), categoria diferente de propósito. Append-only, mesma
// filosofia de interaction_events: nunca UPDATE/DELETE de um log já
// gravado.
@Entity('export_audit_logs')
@Index(['adminUserId', 'createdAt'])
export class ExportAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nullable + ON DELETE SET NULL: hoje não existe endpoint de exclusão de
  // usuário (nenhum admin é apagado na prática), então isto é defesa em
  // profundidade, não um caminho exercitado — nunca perder a LINHA do log
  // mesmo que o vínculo com o admin se perca um dia.
  @Column({ type: 'uuid', nullable: true })
  adminUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'adminUserId' })
  admin: User | null;

  // O recorte pedido (schoolId/challengeId/from/to/format/page/pageSize) —
  // "o quê" do critério de aceite ("quem exportou, o quê, quando").
  // Estrutura livre de propósito (mesmo raciocínio de
  // InteractionEvent.payload): o filtro desta feature pode crescer sem
  // migration nova.
  @Column({ type: 'jsonb' })
  filters: Record<string, unknown>;

  // Quantas linhas de fato saíram nesta chamada — não o total do recorte
  // (que pode passar da página), só o volume de dado realmente entregue
  // nesta resposta.
  @Column({ type: 'int' })
  rowCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
