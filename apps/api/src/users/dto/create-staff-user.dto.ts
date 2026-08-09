import { IsEmail, IsIn, IsString, Length } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

// 1.4 — AC: "criar professor/admin informando nome, e-mail e papel". Nunca
// senha aqui — ver AdminUsersService.create / AuthService.setPassword.
export class CreateStaffUserDto {
  @IsString()
  @Length(2, 120)
  displayName: string;

  @IsEmail()
  email: string;

  @IsIn([Role.TEACHER, Role.ADMIN])
  role: Role.TEACHER | Role.ADMIN;
}
