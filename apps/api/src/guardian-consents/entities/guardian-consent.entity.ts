import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// A2 — Consentimento do responsável legal (ECA), coletado pelo
// professor/admin durante o cadastro do aluno, ANTES da credencial de
// acesso existir (ver StudentAccountsService.registerGuardianConsent/
// activateCredential). Sem método de edição/remoção de propósito — nasce
// como um registro histórico, nunca um formulário reaberto pra "corrigir"
// (uma correção real precisaria de rastreabilidade própria, fora do MVP).
// `studentId` é UNIQUE — um consentimento por aluno (o MVP não modela
// revogação/renovação de consentimento).
@Entity('guardian_consents')
export class GuardianConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true })
  studentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ type: 'varchar', length: 120 })
  guardianName: string;

  // "Vínculo" (ex.: mãe, pai, tutor legal) — texto livre curado pela tela,
  // nunca um enum fixo (mesmo racional de `Classroom.name`): a variedade de
  // vínculos familiares reais não cabe numa lista fechada sem migration a
  // cada caso novo.
  @Column({ type: 'varchar', length: 60 })
  guardianRelationship: string;

  @Column({ type: 'varchar', length: 180 })
  guardianContact: string;

  @Column({ type: 'timestamp' })
  consentedAt: Date;

  // Nullable + ON DELETE SET NULL: defesa em profundidade, mesmo racional
  // de AdminActionLog.actorUserId — não existe hard delete de usuário no
  // MVP, então este caminho não é exercitado na prática.
  @Column({ type: 'uuid', nullable: true })
  collectedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'collectedByUserId' })
  collectedBy: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
