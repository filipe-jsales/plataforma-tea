import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Identificador pseudonimizado, seguro para uso em logs de evento e telas do professor.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  pseudonymId: string;

  // Reversível apenas pela escola (fora do software), nunca exposto em relatórios/UI.
  // Requisito de arquitetura LGPD/ECA, não nota de rodapé de compliance.
  @Column({ type: 'varchar', length: 128, nullable: true })
  schoolReversibleRef: string | null;

  @Column({ type: 'varchar', length: 180, unique: true })
  email: string;

  @Column({ type: 'varchar' })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.STUDENT })
  role: Role;

  @Column({ type: 'varchar', length: 120 })
  displayName: string;

  @CreateDateColumn()
  createdAt: Date;
}
