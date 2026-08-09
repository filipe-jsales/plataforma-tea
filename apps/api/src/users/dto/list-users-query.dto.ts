import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

// 1.4 — AC: "lista paginada com filtro por papel e status".
export class ListUsersQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  // `Type(() => Boolean)` faria `Boolean('false') === true` (qualquer
  // string não-vazia é truthy) — query string sempre chega como texto, por
  // isso a conversão explícita abaixo em vez do cast automático.
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true' || value === true,
  )
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
