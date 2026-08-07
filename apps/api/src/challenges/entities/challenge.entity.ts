import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChallengeTemplate } from '../../challenge-templates/entities/challenge-template.entity';
import { Topic } from '../../subjects/entities/topic.entity';
import { User } from '../../users/entities/user.entity';

// Modelagem mínima (título, enunciado, config, ordem) — o suficiente pra uma
// sequência de desafios Use-Modify-Create por tópico (ver
// docs/ai/modules/backend.md#blocos-por-desafio e a nota de pesquisa em
// challenge-config.interface.ts) e pra interaction_events.challengeId ser FK
// real. O ciclo PRIMM interno (Predict-Run-Investigate-Modify-Make) é
// modelado como vocabulário de `config` distribuído ao longo da sequência
// Use-Modify-Create (não uma máquina de 5 estados numa `Challenge` só) — ver
// a nota de pesquisa "motor PRIMM" em challenge-config.interface.ts e regra
// não-negociável 3.
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

  // 4.2 — presente só em desafios criados pelo professor via formulário
  // guiado (Modo Template); `null` pros desafios curados via seed/migration
  // (o currículo fixo Use-Modify-Create do MVP). `ON DELETE SET NULL`: se um
  // template for descatalogado, o desafio já criado continua existindo —
  // ele guarda seu próprio `config` resolvido, não depende do template pra
  // funcionar em runtime, só pra reabrir o formulário de edição.
  @Column({ type: 'uuid', nullable: true })
  templateId: string | null;

  @ManyToOne(() => ChallengeTemplate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: ChallengeTemplate | null;

  // Snapshot dos parâmetros pedagógicos que o professor escolheu (nº de
  // lados, ângulo, tolerância, blocos habilitados) — persistido no próprio
  // desafio, nunca descartado depois de gerar `config` (RD-C, RQ5: qual
  // configuração curricular foi usada por qual turma precisa ser
  // rastreável). É também a fonte usada pra reabrir o formulário guiado nas
  // telas de edição/duplicação (nunca um editor bruto de `config`/blocos).
  @Column({ type: 'jsonb', nullable: true })
  templateParams: Record<string, unknown> | null;

  // Autoria — só desafios criados via template têm isso preenchido; o
  // currículo semeado não pertence a nenhum professor específico. `ON
  // DELETE SET NULL`: mesma defesa em profundidade de ExportAuditLog.
  // adminUserId (hoje não existe endpoint de exclusão de usuário).
  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
