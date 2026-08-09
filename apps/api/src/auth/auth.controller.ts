import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { AuthResult, AuthService, ClassroomRosterEntry } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { TeacherLoginDto } from './dto/teacher-login.dto';

// Três fluxos distintos, não um formulário genérico — ver
// docs/ai/modules/backend.md (a tela "Quem é você?" é a única coisa que é
// de fato única; o que vem depois diverge totalmente por papel).
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('student/classrooms/:joinCode/roster')
  getRoster(
    @Param('joinCode') joinCode: string,
  ): Promise<ClassroomRosterEntry[]> {
    return this.authService.getClassroomRoster(joinCode);
  }

  @Post('student/login')
  loginStudent(@Body() dto: StudentLoginDto): Promise<AuthResult> {
    return this.authService.loginStudent(dto);
  }

  @Post('teacher/login')
  loginTeacher(@Body() dto: TeacherLoginDto): Promise<AuthResult> {
    return this.authService.loginTeacher(dto);
  }

  @Post('admin/login')
  loginAdmin(@Body() dto: AdminLoginDto): Promise<AuthResult> {
    return this.authService.loginAdmin(dto);
  }

  // 1.4 — sem guard de propósito: acontece antes de qualquer login, o
  // professor/admin recém-criado ainda não tem senha pra autenticar.
  @Post('set-password')
  @HttpCode(200)
  async setPassword(@Body() dto: SetPasswordDto): Promise<{ ok: true }> {
    await this.authService.setPassword(dto.token, dto.password);
    return { ok: true };
  }
}
