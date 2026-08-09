import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateSecret, generateURI } from 'otplib';
import { AuditService } from '../audit/audit.service';
import { Role } from '../common/enums/role.enum';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';
import { User } from './entities/user.entity';
import { PaginatedUsers, UsersService } from './users.service';

export interface AdminUserProfile {
  id: string;
  pseudonymId: string;
  displayName: string;
  email: string | null;
  role: Role;
  active: boolean;
  createdAt: Date;
}

export interface CreateStaffUserResponse {
  user: AdminUserProfile;
  // Devolvidos só nesta resposta, uma única vez — nunca de novo em GET
  // /admin/users. Ver nota de gap de transporte de e-mail em
  // docs/ai/modules/backend.md: hoje não existe envio de e-mail de
  // verdade, então o admin precisa repassar isto manualmente ao
  // professor/admin recém-criado até essa integração existir.
  passwordSetupToken: string;
  totpOtpauthUri: string | null;
}

const ISSUER = 'Plataforma TEA';

// 1.4 — CRUD de usuários (admin). Nunca hard delete (AC explícita); toda
// alteração de papel/status é auditada via AuditService.recordUserAction
// (ver rationale em admin-action-log.entity.ts pra por que isto não é um
// interaction_event).
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: ListUsersQueryDto): Promise<{
    items: AdminUserProfile[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result: PaginatedUsers = await this.usersService.findPaginated({
      role: query.role,
      active: query.active,
      page,
      pageSize,
    });
    return {
      items: result.items.map((user) => this.toProfile(user)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async create(
    dto: CreateStaffUserDto,
    actor: { id: string; role: Role },
  ): Promise<CreateStaffUserResponse> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Já existe um usuário com este e-mail.');
    }

    // otplib's functional API (`generateSecret`/`generateURI`) is
    // synchronous despite the module also exposing async plugins
    // elsewhere — no `await` here (unlike `verify`, used in AuthService).
    const totpSecret = dto.role === Role.ADMIN ? generateSecret() : null;
    const user = await this.usersService.createStaffUser({
      displayName: dto.displayName,
      email: dto.email,
      role: dto.role,
      totpSecret,
    });
    const totpOtpauthUri = totpSecret
      ? generateURI({ secret: totpSecret, label: dto.email, issuer: ISSUER })
      : null;

    await this.auditService.recordUserAction({
      actorUserId: actor.id,
      actorRole: actor.role,
      actionType: 'create',
      targetUserId: user.id,
      targetRole: user.role,
      metadata: { displayName: dto.displayName, email: dto.email },
    });

    return {
      user: this.toProfile(user),
      passwordSetupToken: user.passwordSetupToken!,
      totpOtpauthUri,
    };
  }

  async update(
    id: string,
    dto: UpdateStaffUserDto,
    actor: { id: string; role: Role },
  ): Promise<AdminUserProfile> {
    const target = await this.usersService.findById(id);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if (dto.email !== undefined && target.role === Role.STUDENT) {
      throw new BadRequestException(
        'Alunos não têm e-mail cadastrado — edite pelo fluxo de credencial (1.3).',
      );
    }

    const updated = await this.usersService.updateProfile(id, {
      displayName: dto.displayName,
      email: dto.email,
      role: dto.role,
    });
    if (!updated) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    await this.auditService.recordUserAction({
      actorUserId: actor.id,
      actorRole: actor.role,
      actionType: 'edit',
      targetUserId: updated.id,
      targetRole: updated.role,
      metadata: { changedFields: Object.keys(dto) },
    });

    return this.toProfile(updated);
  }

  async setActive(
    id: string,
    active: boolean,
    actor: { id: string; role: Role },
  ): Promise<AdminUserProfile> {
    const updated = await this.usersService.setActive(id, active);
    if (!updated) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    await this.auditService.recordUserAction({
      actorUserId: actor.id,
      actorRole: actor.role,
      actionType: active ? 'activate' : 'deactivate',
      targetUserId: updated.id,
      targetRole: updated.role,
    });

    return this.toProfile(updated);
  }

  // Nunca devolver passwordHash/totpSecret/passwordSetupToken/
  // loginImageSequence — mesma disciplina de UsersController.toPublicProfile.
  private toProfile(user: User): AdminUserProfile {
    return {
      id: user.id,
      pseudonymId: user.pseudonymId,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    };
  }
}
