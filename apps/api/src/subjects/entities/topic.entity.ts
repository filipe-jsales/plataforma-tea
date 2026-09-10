import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContentCategory } from '../../common/enums/content-category.enum';
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

  // MJ8 — mesmo `conceptId` livre já usado em `MiniGameLevel.conceptId`
  // (ver mini-game-level-config.interface.ts). `null` pra todo tópico
  // curado até agora — nenhum assunto de blocos cadastrado ainda cobre o
  // mesmo conceito de um mini jogo (o único mini jogo hoje é frações, e o
  // currículo de blocos é geometria/estados da matéria). Vira o vínculo
  // real assim que um tópico de blocos do MESMO assunto for cadastrado —
  // ver MetricsTeacherService.getConceptComparison, que já funciona com
  // `null` (mostra "sem desafio de blocos deste assunto ainda", nunca
  // erro).
  @Column({ type: 'varchar', length: 100, nullable: true })
  conceptId: string | null;

  // CC1 — Informática Educacional × Educação em Computação (ver
  // common/enums/content-category.enum.ts). Default cobre todo tópico
  // cadastrado até hoje (todos ensinam disciplina da educação básica) —
  // curado via seed/migration, nunca escolhido pelo professor.
  @Column({ type: 'varchar', length: 40, default: ContentCategory.INFORMATICA_EDUCACIONAL })
  category: ContentCategory;

  @CreateDateColumn()
  createdAt: Date;
}
