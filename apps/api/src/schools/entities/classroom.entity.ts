import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { generateJoinCode } from '../join-code';
import { School } from './school.entity';

// Turma. O professor titular pode ser reatribuído a qualquer momento (UPDATE
// simples, sem migration) — nada na modelagem amarra aluno a um professor
// fixo, ver Enrollment.
@Entity('classrooms')
export class Classroom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schoolId' })
  school: School;

  // Nullable: admin pode criar a turma antes de atribuir um professor.
  // Nada em nível de banco garante que este usuário tem role=teacher — isso
  // é invariante de aplicação, validado na camada de serviço.
  @Column({ type: 'uuid', nullable: true })
  teacherId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'teacherId' })
  teacher: User | null;

  // Ex.: "6º Ano A - Manhã".
  @Column({ type: 'varchar', length: 120 })
  name: string;

  // Código curto que o aluno usa pra entrar no fluxo de login (ex.:
  // "AZUL-7"), gerado automaticamente — nunca digitado pelo professor à mão,
  // pra não virar previsível/sequencial.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, unique: true })
  joinCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  generateJoinCode(): void {
    if (!this.joinCode) {
      this.joinCode = generateJoinCode();
    }
  }
}
