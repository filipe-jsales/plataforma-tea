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
import { Classroom } from './classroom.entity';

// Matrícula: liga aluno ↔ turma (↔ professor, via classroom.teacherId).
// Histórico, não vínculo fixo — encerrar uma matrícula é marcar `active:
// false` + `unenrolledAt`, nunca apagar a linha (mesma lógica de
// append-only dos eventos, aqui aplicada a estado transicional). Isso
// permite trocar aluno de turma/professor sem perder o histórico, e dá
// suporte a comparação longitudinal (RD-L) entre turmas/anos.
@Entity('enrollments')
@Index(['studentId', 'classroomId'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  // Nada em nível de banco garante role=student — invariante de aplicação.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ type: 'uuid' })
  classroomId: string;

  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classroomId' })
  classroom: Classroom;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  enrolledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  unenrolledAt: Date | null;
}
