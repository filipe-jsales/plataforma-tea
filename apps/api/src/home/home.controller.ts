import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { HomeService } from './home.service';

@Controller('home')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('student')
  @Roles(Role.STUDENT)
  getStudentHome(@Request() req: { user: JwtPayload }) {
    return this.homeService.getStudentHome(req.user.sub, req.user.pseudonymId);
  }

  @Get('teacher')
  @Roles(Role.TEACHER)
  getTeacherHome(@Request() req: { user: JwtPayload }) {
    return this.homeService.getTeacherHome(req.user.sub);
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  getAdminHome() {
    return this.homeService.getAdminHome();
  }
}
