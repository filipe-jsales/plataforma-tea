import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Subject } from './subject.entity';

// Assunto dentro de uma disciplina (ex.: "angulos_formas" dentro de
// "geometria"). Cada desafio (feature futura) vai referenciar um topic, não
// a disciplina diretamente — permite granularidade curricular (RD-C).
@Entity('topics')
@Index(['subjectId', 'slug'], { unique: true })
export class Topic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  // Único dentro da disciplina, não globalmente.
  @Column({ type: 'varchar', length: 80 })
  slug: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
