import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import type { MiniGameStage } from '../mini-game-level-config.interface';

// Modelagem mínima (título, enunciado, config, ordem) — mesmo racional de
// Challenge (ver challenges/entities/challenge.entity.ts), mas pro domínio
// de mini jogos sérios (MJ1/MJ7 já implementados; este é o 1º jogo de
// CONTEÚDO, ver docs/ai/backlog/mini-jogo-fabrica-pedacos-iguais.md). 3
// linhas = os 3 níveis Use→Modify→Create do jogo "Fábrica de Pedaços
// Iguais" (seed via migration).
@Entity('mini_game_levels')
export class MiniGameLevel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // String livre (mesmo padrão já em produção em miniGameStore/MiniGamePage
  // — MJ8, o vínculo formal com Topic/Challenge, continua bloqueado/futuro,
  // ver docs/ai/backlog/mini-jogos-serios.md).
  @Column({ type: 'varchar', length: 100 })
  conceptId: string;

  @Column({ type: 'varchar', length: 10 })
  stage: MiniGameStage;

  // Ordem pedagógica DENTRO do conceito — nunca `createdAt`, mesmo
  // raciocínio de Challenge.position.
  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  // Enunciado do pedido em linguagem simples — nunca rótulo técnico PRIMM
  // (regra não-negociável 3).
  @Column({ type: 'text' })
  prompt: string;

  // Tipado em mini-game-level-config.interface.ts.
  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  // Quem editou por último via painel do professor (`PATCH
  // /teacher/minigames/levels/:id`); `null` = ainda no valor seed, nenhum
  // professor customizou ainda. `ON DELETE SET NULL`: mesma defesa em
  // profundidade já usada em Challenge.createdByUserId.
  @Column({ type: 'uuid', nullable: true })
  updatedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updatedByUserId' })
  updatedBy: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
