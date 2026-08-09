import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import {
  AdminUserProfile,
  AdminUsersService,
  CreateStaffUserResponse,
} from './admin-users.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

// 1.4 — CRUD de usuários (admin). Tela administrativa única pra
// professores/admins e (indiretamente) alunos — nunca hard delete.
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.adminUsersService.list(query);
  }

  @Post()
  create(
    @Body() dto: CreateStaffUserDto,
    @Request() req: { user: JwtPayload },
  ): Promise<CreateStaffUserResponse> {
    return this.adminUsersService.create(dto, {
      id: req.user.sub,
      role: req.user.role,
    });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffUserDto,
    @Request() req: { user: JwtPayload },
  ): Promise<AdminUserProfile> {
    return this.adminUsersService.update(id, dto, {
      id: req.user.sub,
      role: req.user.role,
    });
  }

  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Request() req: { user: JwtPayload },
  ): Promise<AdminUserProfile> {
    return this.adminUsersService.setActive(id, dto.active, {
      id: req.user.sub,
      role: req.user.role,
    });
  }
}
