import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Challenge } from '../../challenges/entities/challenge.entity';
import { User } from '../../users/entities/user.entity';

// C2 — autosave incremental do workspace Blockly do aluno. Registro
// MUTÁVEL de "estado atual" (upsert por studentId+challengeId), não um log
// append-only — diferente de `interaction_events` de propósito: aqui só
// importa o ÚLTIMO estado salvo, nunca reconstituir uma linha do tempo (ver
// docs/ai/modules/backend.md, "Autosave do workspace (C2)"). `workspaceJson`
// é o mesmo formato de `Challenge.config.program`
// (`Blockly.serialization.blocks.save()`), mas é dado POR ALUNO — nunca
// escrito em `Challenge.config`, que é conteúdo curricular compartilhado
// por todos os alunos do tópico.
@Entity('student_challenge_drafts')
@Index(['studentId', 'challengeId'], { unique: true })
export class StudentChallengeDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ type: 'uuid' })
  challengeId: string;

  @ManyToOne(() => Challenge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challengeId' })
  challenge: Challenge;

  // Nullable: workspace vazio (aluno apagou tudo) é um estado válido pra
  // salvar — representado por `null` na COLUNA. "Sem rascunho nenhum" é a
  // AUSÊNCIA da linha (ver ChallengeDraftsService.findByStudentAndChallenge),
  // um conceito diferente.
  @Column({ type: 'jsonb', nullable: true })
  workspaceJson: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
