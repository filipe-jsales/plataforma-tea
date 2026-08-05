import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { School } from '../../schools/entities/school.entity';
import { User } from '../../users/entities/user.entity';

// Tabela de reversão pseudônimo → identidade real. Requisito de arquitetura
// LGPD/ECA (regra não-negociável 8), não nota de rodapé: fica num módulo
// próprio (src/identity/) que NENHUM outro módulo deve importar — em
// especial o EventsModule (src/events/), que só pode enxergar
// `pseudonymId`, nunca esta tabela. Ver docs/ai/rules/coding-rule.md.
@Entity('student_identity_reversals')
export class StudentIdentityReversal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Cópia desnormalizada de users.pseudonymId — permite consultar a reversão
  // a partir do pseudônimo (o único identificador que o resto do sistema, ex.
  // interaction_events, conhece) sem dar a esse módulo acesso de leitura à
  // tabela de eventos.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  pseudonymId: string;

  // Referência real, com sentido apenas para o sistema da própria escola
  // (ex.: matrícula no SIS da escola). Nunca exposta em UI/relatório do
  // professor — só a escola/admin, fora deste software, sabe reverter.
  @Column({ type: 'varchar', length: 128, nullable: true })
  schoolReversibleRef: string | null;

  @Column({ type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @CreateDateColumn()
  createdAt: Date;
}
