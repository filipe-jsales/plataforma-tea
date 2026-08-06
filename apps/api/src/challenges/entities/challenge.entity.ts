import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Topic } from '../../subjects/entities/topic.entity';

// Modelagem mínima (título, enunciado, config, ordem) — o suficiente pra uma
// sequência de desafios Use-Modify-Create por tópico (ver
// docs/ai/modules/backend.md#blocos-por-desafio e a nota de pesquisa em
// challenge-config.interface.ts) e pra interaction_events.challengeId ser FK
// real. O ciclo PRIMM interno (Predict-Run-Investigate-Modify-Make como
// estrutura de tela, não só a paleta Use-Modify-Create) ainda não está
// modelado — ver regra não-negociável 3 e "Próximos passos" em backend.md.
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

  // Config tipado em challenge-config.interface.ts: stage Use-Modify-Create,
  // blocos permitidos, meta, e (fase Use) o programa pré-montado + pergunta
  // de investigação. Ver "Blocos por desafio" em docs/ai/modules/backend.md.
  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  // Ordem pedagógica do desafio DENTRO do tópico — nunca `createdAt`. Existe
  // especificamente para permitir inserir uma etapa no meio depois sem
  // precisar forjar timestamp (ex.: o desafio "Modify" que falta entre os 2
  // desafios seed atuais, ver nota de pesquisa em
  // challenge-config.interface.ts). Mesmo raciocínio de
  // Illustration.position/BlockDefinition.position.
  @Column({ type: 'int' })
  position: number;

  @CreateDateColumn()
  createdAt: Date;
}
