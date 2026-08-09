import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { verify as verifyTotp } from 'otplib';
import { EventCategory } from '../common/enums/event-category.enum';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { SchoolsService } from '../schools/schools.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { TeacherLoginDto } from './dto/teacher-login.dto';

export interface ClassroomRosterEntry {
  userId: string;
  displayName: string;
  avatar: { label: string; assetRef: string } | null;
}

export interface AuthResult {
  accessToken: string;
  role: Role;
  displayName: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly schoolsService: SchoolsService,
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
  ) {}

  // Passo "código da turma" + "seleção de avatar" do fluxo aluno. Nunca
  // devolve e-mail, pseudônimo ou qualquer dado de identidade reversível —
  // só o suficiente pro aluno se reconhecer numa lista.
  async getClassroomRoster(joinCode: string): Promise<ClassroomRosterEntry[]> {
    const classroom =
      await this.schoolsService.findClassroomByJoinCode(joinCode);
    if (!classroom) {
      throw new NotFoundException('Código de turma não encontrado.');
    }
    const enrollments = await this.schoolsService.findActiveStudentsInClassroom(
      classroom.id,
    );
    return enrollments.map((enrollment) => ({
      userId: enrollment.student.id,
      displayName: enrollment.student.displayName,
      avatar: enrollment.student.avatar
        ? {
            label: enrollment.student.avatar.label,
            assetRef: enrollment.student.avatar.assetRef,
          }
        : null,
    }));
  }

  async loginStudent(dto: StudentLoginDto): Promise<AuthResult> {
    const user = await this.usersService.findById(dto.userId);
    if (!user || user.role !== Role.STUDENT || !user.active) {
      // userId inválido/adulterado: não é uma tentativa de login de um aluno
      // real, então não entra no schema RD-I (que exige um studentPseudoId
      // válido) — ficaria fora do propósito do dado.
      throw new UnauthorizedException('Sequência incorreta.');
    }

    const success = this.sequenceMatches(
      user.loginImageSequence,
      dto.imageSequence,
    );

    await this.eventsService.record({
      studentPseudoId: user.pseudonymId,
      category: EventCategory.INTERACTION,
      type: 'login_attempt',
      payload: {
        role: Role.STUDENT,
        success,
        durationMs: dto.durationMs ?? null,
        retryCount: dto.retryCount ?? null,
      },
    });

    if (!success) {
      throw new UnauthorizedException('Sequência incorreta.');
    }

    await this.eventsService.record({
      studentPseudoId: user.pseudonymId,
      category: EventCategory.LONGITUDINAL,
      type: 'login_success',
    });

    return this.issueToken(user);
  }

  async loginTeacher(dto: TeacherLoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailAndRole(
      dto.email,
      Role.TEACHER,
    );
    await this.assertPassword(user, dto.password);
    return this.issueToken(user!);
  }

  async loginAdmin(dto: AdminLoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailAndRole(
      dto.email,
      Role.ADMIN,
    );
    await this.assertPassword(user, dto.password);
    const otpResult = user?.totpSecret
      ? await verifyTotp({ secret: user.totpSecret, token: dto.otp })
      : null;
    if (!otpResult?.valid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    return this.issueToken(user!);
  }

  // 1.4 — "desativar um usuário bloqueia login imediatamente". Consome o
  // link de definição de senha (1.4, criação de professor/admin pelo
  // admin) — ver nota de gap de transporte de e-mail em
  // docs/ai/modules/backend.md: o token hoje é devolvido na resposta da
  // API de criação, não enviado por e-mail de verdade.
  async setPassword(token: string, password: string): Promise<void> {
    const user = await this.usersService.findByPasswordSetupToken(token);
    const expired =
      !user?.passwordSetupTokenExpiresAt ||
      user.passwordSetupTokenExpiresAt < new Date();
    if (!user || expired) {
      throw new UnauthorizedException(
        'Link de definição de senha inválido ou expirado.',
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.usersService.setPasswordHash(user.id, passwordHash);
  }

  private async assertPassword(
    user: User | null,
    password: string,
  ): Promise<void> {
    // Regra não-negociável 1.4: "desativar bloqueia login imediatamente" —
    // checado antes do hash pra nunca deixar a senha certa de uma conta
    // desativada passar. Mesma mensagem genérica de credenciais inválidas,
    // pra não vazar se a conta existe mas está desativada.
    const matches =
      !!user?.active &&
      !!user.passwordHash &&
      (await bcrypt.compare(password, user.passwordHash));
    if (!matches) {
      // Mensagem genérica de propósito — não revelar se foi o e-mail ou a
      // senha que falhou.
      throw new UnauthorizedException('Credenciais inválidas.');
    }
  }

  private sequenceMatches(
    stored: string[] | null,
    submitted: string[],
  ): boolean {
    if (!stored || stored.length !== submitted.length) {
      return false;
    }
    return stored.every((imageId, index) => imageId === submitted[index]);
  }

  private issueToken(user: User): AuthResult {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      pseudonymId: user.pseudonymId,
      role: user.role,
    });
    return { accessToken, role: user.role, displayName: user.displayName };
  }
}
