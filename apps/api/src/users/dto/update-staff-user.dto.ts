import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

// 1.4 — AC: "editar dados cadastrais de qualquer usuário, exceto
// credencial de aluno (que segue fluxo 1.3)". Sem avatarId/
// loginImageSequence de propósito — ver AdminUsersService/UsersService.
export class UpdateStaffUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  displayName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn([Role.TEACHER, Role.ADMIN])
  role?: Role.TEACHER | Role.ADMIN;
}
