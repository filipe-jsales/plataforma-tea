import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SoftDeletableEntity } from '../../common/entities/soft-deletable.entity';

// CRUD administrativo de escola — container multi-tenant (ver
// docs/ai/modules/backend.md "Gestão de escolas e turmas (admin)"). Estende
// SoftDeletableEntity (B1): "desativar" uma escola é soft delete
// (`deletedAt` preenchido), nunca um hard delete — turmas/matrículas
// vinculadas continuam existindo no banco, só a escola some das listagens
// padrão do admin.
@Entity('schools')
export class School extends SoftDeletableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  // Identificador externo opcional (ex.: código INEP) — nunca obrigatório
  // (AC: "sem campos obrigatórios que exijam conhecimento técnico"). Postgres
  // permite múltiplos NULL num UNIQUE, mesmo padrão de `User.email`.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40, nullable: true })
  externalId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
