import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Topic } from '../../subjects/entities/topic.entity';

// Modelagem mínima: o suficiente para existir "1 desafio de geometria"
// referenciável por interaction_events.challengeId (seed do MVP, ver
// docs/ai/modules/database.md). O ciclo PRIMM interno, a paleta de blocos
// contextual (Use–Modify–Create) e o motor de execução (Blockly/PixiJS) são
// features futuras — não modeladas aqui ainda, ver regra não-negociável 2/3.
@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  topicId: string;

  @ManyToOne(() => Topic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'topicId' })
  topic: Topic;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  // Enunciado em linguagem não técnica — nunca expõe rótulo PRIMM/técnico ao
  // aluno (a estrutura PRIMM é interna, ver regra não-negociável 3).
  @Column({ type: 'text' })
  prompt: string;

  // Placeholder para configuração futura (toolbox restrita, blocos
  // permitidos por estágio Use-Modify-Create etc.) — nasce vazio no MVP.
  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
