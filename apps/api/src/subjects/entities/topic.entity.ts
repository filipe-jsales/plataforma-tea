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

  // Qual página/experiência de frontend renderiza os desafios deste tópico
  // — 'blocks_turtle' (ChallengePage, mundo de tartaruga/Pixi) ou
  // 'water_state' (WaterStateChallengePage, sem Pixi). Diferente de
  // subjects/blocks (catálogo que cresce só com dado), um domínio novo
  // SEMPRE exige uma página nova de verdade — nunca é só conteúdo, por isso
  // é uma coluna com um conjunto pequeno e fechado de valores, não uma
  // tabela à parte (mesmo raciocínio de `User.role`, ver coding-rule.md).
  @Column({ type: 'varchar', length: 40, default: 'blocks_turtle' })
  domain: string;

  @CreateDateColumn()
  createdAt: Date;
}
