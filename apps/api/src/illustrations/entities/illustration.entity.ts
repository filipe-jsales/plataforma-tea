import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { IllustrationKind } from '../../common/enums/illustration-kind.enum';

// Catálogo (tabela, não enum fixo — mesmo padrão de subjects/topics): cresce
// sem migration destrutiva conforme a escola precisar de mais opções.
// `position` é a ordem de exibição e NUNCA deve mudar entre sessões — layout
// consistente/previsível é requisito explícito do fluxo de login por
// sequência de imagens (posição fixa, sem elemento decorativo concorrente).
@Entity('illustrations')
@Index(['kind', 'position'])
export class Illustration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: IllustrationKind })
  kind: IllustrationKind;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80, unique: true })
  slug: string;

  // Rotulagem redundante (ícone + texto) — nunca só a ilustração.
  @Column({ type: 'varchar', length: 80 })
  label: string;

  // Chave que o front resolve para o asset visual real (svg/ilustração).
  // Este backend nunca armazena a imagem em si.
  @Column({ type: 'varchar', length: 120 })
  assetRef: string;

  @Column({ type: 'int' })
  position: number;

  @CreateDateColumn()
  createdAt: Date;
}
