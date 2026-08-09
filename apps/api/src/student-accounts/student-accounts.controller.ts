import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { CreateStudentAccountDto } from './dto/create-student-account.dto';
import {
  StudentAccountCredential,
  StudentAccountsService,
} from './student-accounts.service';

// 1.2 — "Adicionar aluno": professor (só nas próprias turmas) ou admin
// (qualquer turma) cadastra o aluno; nunca o próprio aluno.
@Controller('teacher/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
export class StudentAccountsController {
  constructor(
    private readonly studentAccountsService: StudentAccountsService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateStudentAccountDto,
    @Request() req: { user: JwtPayload },
  ): Promise<StudentAccountCredential> {
    return this.studentAccountsService.create(dto, {
      id: req.user.sub,
      role: req.user.role,
    });
  }
}
