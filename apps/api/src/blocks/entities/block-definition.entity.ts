import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Catálogo (tabela, não enum fixo — mesmo padrão de subjects/topics/
// illustrations): a paleta de blocos cresce conforme novos desafios
// precisarem de blocos novos, sem migration destrutiva. `category` é texto
// livre curado por quem cadastra o bloco (nunca enum de código) — agrupa a
// paleta em abas pequenas e nomeadas (AC5), não uma lista única enorme.
@Entity('blocks')
@Index(['category', 'position'])
export class BlockDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Ex.: "move_forward". É o `type` que o Blockly usa internamente
  // (Blockly.defineBlocksWithJsonArray) — referenciado por
  // Challenge.config.allowedBlockTypes.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80, unique: true })
  blockType: string;

  // Rótulo em português simples, exibido na paleta — nunca o blockType cru.
  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'varchar', length: 60 })
  category: string;

  @Column({ type: 'varchar', length: 60 })
  categoryLabel: string;

  // Matiz de cor (0-360) do bloco/categoria no Blockly.
  @Column({ type: 'int' })
  colour: number;

  // Ordem de exibição dentro da categoria — fixa entre sessões (mesmo
  // raciocínio de Illustration.position: previsibilidade de layout).
  @Column({ type: 'int' })
  position: number;

  // Definição JSON do bloco no formato esperado por
  // Blockly.defineBlocksWithJsonArray (message0/args0/previousStatement/...).
  // O frontend nunca hardcoda a forma do bloco — lê daqui, registra em
  // runtime. Isso é o que permite um bloco novo existir só cadastrando uma
  // linha (+ o desafio que o usa), sem deploy de frontend.
  @Column({ type: 'jsonb' })
  blocklyJson: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
