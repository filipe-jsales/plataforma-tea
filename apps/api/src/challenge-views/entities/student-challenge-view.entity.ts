import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Challenge } from '../../challenges/entities/challenge.entity';
import { User } from '../../users/entities/user.entity';

// E1 — "aluno já abriu este desafio alguma vez". Registro de estado
// simples (existência da linha = visto), não um evento — mesmo racional já
// documentado pra `ChallengeClassroomAllocation`/`StudentChallengeDraft`:
// estado do PRÓPRIO aluno sobre um desafio, nunca um `interaction_event`
// fake (aquele é log imutável pra reconstituir linha do tempo, RQ5; isto é
// só "existe ou não existe"). Sem `updatedAt`/revogação de propósito —
// "visto" nunca volta a "não visto" (AC2: o marcador nunca reaparece).
@Entity('student_challenge_views')
@Index(['studentId', 'challengeId'], { unique: true })
export class StudentChallengeView {
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

  @CreateDateColumn()
  firstViewedAt: Date;
}
