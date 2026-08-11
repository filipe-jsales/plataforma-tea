import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { CreateStudentAccountDto } from './dto/create-student-account.dto';
import { RegisterGuardianConsentDto } from './dto/register-guardian-consent.dto';
import {
  PendingStudentAccount,
  StudentAccountCredential,
  StudentAccountsService,
} from './student-accounts.service';

// 1.2/A2 — "Adicionar aluno": professor (só nas próprias turmas) ou admin
// (qualquer turma) cadastra o aluno; nunca o próprio aluno. Três passos
// desde A2 — ver StudentAccountsService pro racional completo de cada um.
@Controller('teacher/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
export class StudentAccountsController {
  constructor(
    private readonly studentAccountsService: StudentAccountsService,
  ) {}

  @Post()
  createPending(
    @Body() dto: CreateStudentAccountDto,
    @Request() req: { user: JwtPayload },
  ): Promise<PendingStudentAccount> {
    return this.studentAccountsService.createPending(dto, {
      id: req.user.sub,
      role: req.user.role,
    });
  }

  @Post(':id/guardian-consent')
  registerGuardianConsent(
    @Param('id') id: string,
    @Body() dto: RegisterGuardianConsentDto,
    @Request() req: { user: JwtPayload },
  ): Promise<StudentAccountCredential> {
    return this.studentAccountsService.registerGuardianConsent(id, dto, {
      id: req.user.sub,
      role: req.user.role,
    });
  }

  // A2 (AC3) — nova tentativa de ativação, pro caso de a ativação em si
  // falhar depois do consentimento já ter sido registrado (a chamada
  // normal do passo 2 já ativa sozinha — este endpoint é o caminho de
  // recuperação/retentativa, e também a superfície testável do bloqueio
  // "consentimento pendente").
  @Post(':id/activate-credential')
  activateCredential(
    @Param('id') id: string,
  ): Promise<StudentAccountCredential> {
    return this.studentAccountsService.activateCredential(id);
  }
}
