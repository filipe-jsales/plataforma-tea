import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { CreateSchoolDto } from './dto/create-school.dto';
import { SetActiveStatusDto } from './dto/set-active-status.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import {
  AdminClassroomProfile,
  AdminSchoolProfile,
  SchoolsAdminService,
} from './schools-admin.service';

// CRUD administrativo de escolas/turmas — "Gestão de escolas, turmas e
// matrículas" (User Story: "Como admin, quero cadastrar e gerenciar escolas
// e suas turmas, para que múltiplas escolas operem na mesma plataforma de
// forma isolada"). O vínculo aluno↔turma em si (matrícula) já tem endpoint
// próprio desde 1.5 (ver EnrollmentsController) — este controller cobre só
// escola e turma como containers administrativos.
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SchoolsAdminController {
  constructor(private readonly schoolsAdminService: SchoolsAdminService) {}

  @Get('schools')
  listSchools(): Promise<AdminSchoolProfile[]> {
    return this.schoolsAdminService.listSchools();
  }

  @Post('schools')
  createSchool(@Body() dto: CreateSchoolDto): Promise<AdminSchoolProfile> {
    return this.schoolsAdminService.createSchool(dto);
  }

  @Get('schools/:id')
  getSchool(@Param('id') id: string): Promise<AdminSchoolProfile> {
    return this.schoolsAdminService.getSchool(id);
  }

  @Patch('schools/:id')
  updateSchool(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolDto,
  ): Promise<AdminSchoolProfile> {
    return this.schoolsAdminService.updateSchool(id, dto);
  }

  @Patch('schools/:id/status')
  setSchoolStatus(
    @Param('id') id: string,
    @Body() dto: SetActiveStatusDto,
    @Request() req: { user: JwtPayload },
  ): Promise<AdminSchoolProfile> {
    return this.schoolsAdminService.setSchoolActive(
      id,
      dto.active,
      req.user.sub,
    );
  }

  @Get('schools/:schoolId/classrooms')
  listClassrooms(
    @Param('schoolId') schoolId: string,
  ): Promise<AdminClassroomProfile[]> {
    return this.schoolsAdminService.listClassrooms(schoolId);
  }

  @Post('schools/:schoolId/classrooms')
  createClassroom(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateClassroomDto,
  ): Promise<AdminClassroomProfile> {
    return this.schoolsAdminService.createClassroom(schoolId, dto);
  }

  @Patch('classrooms/:id')
  updateClassroom(
    @Param('id') id: string,
    @Body() dto: UpdateClassroomDto,
  ): Promise<AdminClassroomProfile> {
    return this.schoolsAdminService.updateClassroom(id, dto);
  }

  @Patch('classrooms/:id/status')
  setClassroomStatus(
    @Param('id') id: string,
    @Body() dto: SetActiveStatusDto,
    @Request() req: { user: JwtPayload },
  ): Promise<AdminClassroomProfile> {
    return this.schoolsAdminService.setClassroomActive(
      id,
      dto.active,
      req.user.sub,
    );
  }
}
