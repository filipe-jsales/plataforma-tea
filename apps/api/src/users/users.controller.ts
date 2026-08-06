import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { UpdateSensoryProfileDto } from './dto/update-sensory-profile.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

// Nunca devolver passwordHash/totpSecret/loginImageSequence — são
// credenciais, não perfil.
function toPublicProfile(user: User) {
  return {
    id: user.id,
    pseudonymId: user.pseudonymId,
    role: user.role,
    displayName: user.displayName,
    avatar: user.avatar ? { label: user.avatar.label, assetRef: user.avatar.assetRef } : null,
    soundEnabled: user.soundEnabled,
    animationEnabled: user.animationEnabled,
    sensoryOnboardingCompletedAt: user.sensoryOnboardingCompletedAt,
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Request() req: { user: JwtPayload }) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return toPublicProfile(user);
  }

  // Aluno altera a própria preferência; professor/admin podem alterar a de
  // qualquer aluno (painel de turma) — regra descrita no critério de aceite
  // de 2.2. Autorização mais fina (só o professor da turma do aluno) fica
  // para quando o painel do professor existir de fato.
  @Patch(':id/sensory-profile')
  async updateSensoryProfile(
    @Param('id') id: string,
    @Body() dto: UpdateSensoryProfileDto,
    @Request() req: { user: JwtPayload },
  ) {
    const isSelf = req.user.sub === id;
    const isStaff = req.user.role === Role.TEACHER || req.user.role === Role.ADMIN;
    if (!isSelf && !isStaff) {
      throw new ForbiddenException('Sem permissão para alterar esse perfil sensorial.');
    }
    const user = await this.usersService.updateSensoryProfile(id, dto);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return toPublicProfile(user);
  }
}
