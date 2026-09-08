import { Body, Controller, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { ClassroomSettingsService, ComparisonSetting } from './classroom-settings.service';
import { UpdateComparisonSettingDto } from './dto/update-comparison-setting.dto';

// 4.3/7.3 — path `teacher/classrooms`, mesmo prefixo de
// ClassroomRosterController (EnrollmentsModule): sufixo literal diferente
// (`comparison-setting` vs `students`), sem conflito de rota dinâmica.
@Controller('teacher/classrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
export class ClassroomSettingsController {
  constructor(private readonly classroomSettingsService: ClassroomSettingsService) {}

  @Patch(':classroomId/comparison-setting')
  updateComparisonSetting(
    @Param('classroomId') classroomId: string,
    @Body() dto: UpdateComparisonSettingDto,
    @Request() req: { user: JwtPayload },
  ): Promise<ComparisonSetting> {
    return this.classroomSettingsService.setComparisonEnabled(classroomId, dto.enabled, {
      id: req.user.sub,
      role: req.user.role,
    });
  }
}
