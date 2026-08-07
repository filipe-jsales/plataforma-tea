import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Topic } from '../../subjects/entities/topic.entity';
import type { TemplateParameterDefinition } from '../challenge-template-parameter.interface';

// Catálogo (tabela, não enum fixo — mesmo padrão de subjects/blocks/
// illustrations, ver coding-rule.md "Catálogo... é tabela, nunca enum
// fixo"): a biblioteca curada de templates cresce (geometria hoje, outra
// disciplina depois) sem migration destrutiva nem deploy de frontend — só
// uma linha nova + o handler correspondente registrado em
// handlers/template-registry.ts (ver nota de pesquisa completa em
// challenge-templates.service.ts sobre por que o desenho é
// dado+handler-por-key, não 100% dado).
@Entity('challenge_templates')
export class ChallengeTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Resolve o handler em TEMPLATE_HANDLERS (handlers/template-registry.ts) —
  // é o único acoplamento entre a linha de catálogo (dado) e a lógica de
  // validação/montagem de config (código). Nunca o `blockType`/estrutura
  // Blockly em si.
  @Column({ type: 'varchar', length: 60, unique: true })
  key: string;

  // Nome em linguagem pedagógica simples (AC1) — ex.: "Desenhar um polígono
  // regular". Nunca o nome técnico do bloco Blockly correspondente.
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  // Emoji — mesmo "sistema de ícone" do resto da plataforma (ver
  // "Ícone" em docs/ai/modules/frontend.md), sem lib de ícone nova.
  @Column({ type: 'varchar', length: 8 })
  icon: string;

  @Column({ type: 'uuid' })
  topicId: string;

  @ManyToOne(() => Topic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'topicId' })
  topic: Topic;

  // Definições de campo do formulário guiado — tipadas em
  // challenge-template-parameter.interface.ts. O frontend renderiza cada
  // campo só a partir de `type`/`visualPreview`, nunca por nome de
  // parâmetro hardcoded (é o que torna um template novo "reutilizável sem
  // refazer do zero").
  @Column({ type: 'jsonb' })
  parameterSchema: TemplateParameterDefinition[];

  // Ordem de exibição na galeria (AC1) — nunca `createdAt`, mesmo raciocínio
  // de Challenge.position/BlockDefinition.position.
  @Column({ type: 'int' })
  position: number;

  @CreateDateColumn()
  createdAt: Date;
}
