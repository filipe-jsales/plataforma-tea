import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContentCategory } from '../../common/enums/content-category.enum';
import { User } from '../../users/entities/user.entity';
import type { MiniGameKey, MiniGameStage } from '../mini-game-level-config.interface';

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

  // MJ9 — QUAL jogo esta linha pertence (mesmo racional de `Topic.domain`).
  // Único acoplamento entre a linha de catálogo e o validador de config
  // correspondente (ver validators/validator-registry.ts). Sem default de
  // propósito — curado explicitamente por seed/migration (ver migration
  // `AddGameKeyToMiniGameLevels`), nunca um valor implícito.
  @Column({ type: 'varchar', length: 40 })
  gameKey: MiniGameKey;

  // CC1 — Informática Educacional × Educação em Computação (ver
  // common/enums/content-category.enum.ts). As 3 linhas de um mesmo
  // `conceptId` sempre compartilham categoria — redundância barata,
  // evita uma tabela "família de jogo" só pra isto. Default cobre
  // "Fábrica de Pedaços Iguais" (frações, Informática Educacional); um
  // jogo futuro de Educação em Computação (ex.: MJ10) grava o valor
  // explícito no seed, nunca deixa cair no default.
  @Column({ type: 'varchar', length: 40, default: ContentCategory.INFORMATICA_EDUCACIONAL })
  category: ContentCategory;

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
