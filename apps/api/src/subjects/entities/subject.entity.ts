import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Tabela, não enum: o MVP cadastra uma única disciplina (geometria), mas a
// estrutura já suporta N disciplinas sem migration destrutiva quando o
// catálogo crescer.
@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Ex.: "geometria". Usado em rotas/config, nunca o uuid.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
