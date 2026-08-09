import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { TransferStudentDto } from './dto/transfer-student.dto';
import {
  ClassroomRosterEntry,
  EnrollmentsService,
  TransferResult,
} from './enrollments.service';

// 1.5 — matricular/transferir aluno de turma. Path deliberadamente
// diferente de StudentAccountsController (`POST /teacher/students`, 1.2) —
// aqui o aluno já existe, o que muda é o vínculo com a turma.
@Controller('teacher/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post(':studentId/enrollments')
  transfer(
    @Param('studentId') studentId: string,
    @Body() dto: TransferStudentDto,
    @Request() req: { user: JwtPayload },
  ): Promise<TransferResult> {
    return this.enrollmentsService.transfer(studentId, dto.classroomId, {
      id: req.user.sub,
      role: req.user.role,
    });
  }
}

// Roster de uma turma — usado pra escolher qual aluno transferir/gerenciar.
// Controller próprio (prefixo `teacher/classrooms`, distinto de
// `teacher/students`) — mesmo racional de separação de
// StudentClassroomChallengesController vs ChallengesController (ver
// docs/ai/modules/backend.md): evita duas rotas dinâmicas concorrendo pelo
// mesmo prefixo.
@Controller('teacher/classrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
export class ClassroomRosterController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get(':classroomId/students')
  listRoster(
    @Param('classroomId') classroomId: string,
    @Request() req: { user: JwtPayload },
  ): Promise<ClassroomRosterEntry[]> {
    return this.enrollmentsService.listRoster(classroomId, {
      id: req.user.sub,
      role: req.user.role,
    });
  }
}
