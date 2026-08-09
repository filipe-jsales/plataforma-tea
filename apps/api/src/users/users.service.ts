import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { User } from './entities/user.entity';

export interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateStaffUserParams {
  displayName: string;
  email: string;
  role: Role.TEACHER | Role.ADMIN;
  // Só presente pra role=admin (segundo fator obrigatório) — gerado por
  // quem chama (AdminUsersService, via otplib) porque isso é lógica de
  // autenticação, não de persistência.
  totpSecret?: string | null;
}

// 48h é tempo suficiente pro admin repassar o link (hoje manualmente, ver
// nota de gap de e-mail) sem deixar o token válido indefinidamente.
const PASSWORD_SETUP_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export interface CreateStudentParams {
  displayName: string;
  avatarId: string;
  loginImageSequence: string[];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // Escopado por role de propósito: uma senha correta de professor não deve
  // autenticar como admin, mesmo que o e-mail coincida por acidente.
  findByEmailAndRole(email: string, role: Role): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email, role } });
  }

  findByPseudonymId(pseudonymId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { pseudonymId } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: { avatar: true },
    });
  }

  countAll(): Promise<number> {
    return this.usersRepository.count();
  }

  async updateSensoryProfile(
    id: string,
    prefs: { soundEnabled: boolean; animationEnabled: boolean },
  ): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { avatar: true },
    });
    if (!user) {
      return null;
    }
    user.soundEnabled = prefs.soundEnabled;
    user.animationEnabled = prefs.animationEnabled;
    // Só marca a conclusão do onboarding na primeira vez — trocas
    // posteriores (ex.: professor ajustando depois) não devem "reabrir"
    // o onboarding nem mexer nesse timestamp.
    if (!user.sensoryOnboardingCompletedAt) {
      user.sensoryOnboardingCompletedAt = new Date();
    }
    return this.usersRepository.save(user);
  }

  // 1.4 — listagem paginada com filtro por papel/status (AC: "lista
  // paginada com filtro por papel e status").
  async findPaginated(params: {
    role?: Role;
    active?: boolean;
    page: number;
    pageSize: number;
  }): Promise<PaginatedUsers> {
    const where: FindOptionsWhere<User> = {};
    if (params.role !== undefined) {
      where.role = params.role;
    }
    if (params.active !== undefined) {
      where.active = params.active;
    }
    const [items, total] = await this.usersRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  // 1.4 — cria professor/admin sem senha (nunca preenchida pelo admin que
  // cadastra) — `passwordSetupToken`/`passwordSetupTokenExpiresAt` são o
  // que sustenta o "sistema envia e-mail de definição de senha" da AC; ver
  // AuthService.setPassword pro consumo do token e a nota de gap de
  // transporte de e-mail em docs/ai/modules/backend.md.
  createStaffUser(params: CreateStaffUserParams): Promise<User> {
    const user = this.usersRepository.create({
      displayName: params.displayName,
      email: params.email,
      role: params.role,
      totpSecret: params.totpSecret ?? null,
      passwordSetupToken: randomUUID(),
      passwordSetupTokenExpiresAt: new Date(
        Date.now() + PASSWORD_SETUP_TOKEN_TTL_MS,
      ),
    });
    return this.usersRepository.save(user);
  }

  // 1.2 — cria aluno sem e-mail/senha/telefone (AC: "O formulário não
  // possui campo de e-mail, senha ou telefone do aluno"). Credencial real
  // (avatar + sequência de imagens) é resolvida por quem chama
  // (StudentAccountsService) reaproveitando o mecanismo de login já
  // existente (ver IllustrationsService) — nunca o nome do aluno.
  createStudent(params: CreateStudentParams): Promise<User> {
    const user = this.usersRepository.create({
      displayName: params.displayName,
      role: Role.STUDENT,
      avatarId: params.avatarId,
      loginImageSequence: params.loginImageSequence,
    });
    return this.usersRepository.save(user);
  }

  // 1.4 — "editar dados cadastrais de qualquer usuário, exceto credencial
  // de aluno" — este método nunca toca avatarId/loginImageSequence/
  // passwordHash/totpSecret, só os campos cadastrais comuns a qualquer
  // papel.
  async updateProfile(
    id: string,
    dto: { displayName?: string; email?: string; role?: Role },
  ): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }
    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }
    if (dto.email !== undefined) {
      user.email = dto.email;
    }
    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    return this.usersRepository.save(user);
  }

  // 1.4 — "desativar bloqueia login imediatamente, mas não apaga dados
  // históricos" (soft delete). Nunca um hard delete — não existe método de
  // remoção nesta classe de propósito.
  async setActive(id: string, active: boolean): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }
    user.active = active;
    return this.usersRepository.save(user);
  }

  findByPasswordSetupToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { passwordSetupToken: token },
    });
  }

  // Consumido só por AuthService.setPassword — a validação de token/
  // expiração fica lá (mesmo lugar que já concentra bcrypt/regras de
  // autenticação), este método só grava o resultado.
  async setPasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(id, {
      passwordHash,
      passwordSetupToken: null,
      passwordSetupTokenExpiresAt: null,
    });
  }
}
