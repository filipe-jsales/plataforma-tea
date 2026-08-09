import { randomUUID } from 'node:crypto';
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
import { Role } from '../../common/enums/role.enum';
import { Illustration } from '../../illustrations/entities/illustration.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Identificador pseudonimizado, seguro para uso em logs de evento e telas do
  // professor. Gerado automaticamente na criação da conta (ver
  // generatePseudonymId abaixo) — nunca escolhido/derivado de dado real do
  // aluno (nome, e-mail etc.), para não ser reversível por inspeção.
  // A ligação pseudônimo → identidade real fica em StudentIdentityReversal
  // (src/identity/), uma tabela separada que o EventsModule nunca acessa.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  pseudonymId: string;

  // Nullable: aluno não tem e-mail/senha (login por turma+avatar+imagens,
  // ver loginImageSequence). Preenchido só para teacher/admin. Postgres
  // permite múltiplos NULL num UNIQUE — não precisa de índice parcial.
  @Column({ type: 'varchar', length: 180, unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  passwordHash: string | null;

  // Só para role=admin — segundo fator obrigatório (papel com maior
  // superfície de risco, acesso a dados de múltiplas escolas).
  @Column({ type: 'varchar', length: 64, nullable: true })
  totpSecret: string | null;

  // Só para role=student — identidade visual em listas/roster (nunca foto
  // real). Selecionado pelo aluno/professor na criação da conta.
  @Column({ type: 'uuid', nullable: true })
  avatarId: string | null;

  @ManyToOne(() => Illustration, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'avatarId' })
  avatar: Illustration | null;

  // Só para role=student — credencial do login por sequência de imagens:
  // 3 ids de Illustration(kind=login_image), em ordem, comparados
  // exatamente na autenticação. Pool separado do avatar de propósito (ver
  // Illustration). Postgres array preserva a ordem nativamente.
  @Column({ type: 'uuid', array: true, nullable: true })
  loginImageSequence: string[] | null;

  @Column({ type: 'enum', enum: Role, default: Role.STUDENT })
  role: Role;

  @Column({ type: 'varchar', length: 120 })
  displayName: string;

  // Soft delete (1.4, AC: "Desativar bloqueia login imediatamente, mas não
  // apaga dados históricos"). Nunca um hard delete na interface do MVP —
  // ver AuthService, que rejeita login para active=false antes de checar
  // credencial.
  @Column({ type: 'boolean', default: true })
  active: boolean;

  // Fluxo de definição de senha (1.4, criação de professor/admin pelo
  // admin): token de uso único, gerado na criação da conta, consumido por
  // POST /auth/set-password. Não é hasheado — mesmo nível de proteção que
  // `joinCode`/`pseudonymId` (identificador aleatório, não reversível por
  // inspeção), pela mesma razão que este projeto já aceita em outros
  // identificadores gerados. Nulo depois de consumido.
  @Column({ type: 'uuid', nullable: true })
  passwordSetupToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordSetupTokenExpiresAt: Date | null;

  // Perfil sensorial persistente (regra não-negociável 1): desligado por
  // padrão, definido no onboarding do aluno (2.2) ou pelo professor no
  // painel de turma/aluno — nunca precisa ser refeito a cada sessão/device.
  @Column({ type: 'boolean', default: false })
  soundEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  animationEnabled: boolean;

  // Null até o aluno concluir o onboarding sensorial pela primeira vez —
  // é o sinalizador que decide se a tela de onboarding aparece.
  @Column({ type: 'timestamp', nullable: true })
  sensoryOnboardingCompletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  generatePseudonymId(): void {
    if (!this.pseudonymId) {
      this.pseudonymId = randomUUID();
    }
  }
}
