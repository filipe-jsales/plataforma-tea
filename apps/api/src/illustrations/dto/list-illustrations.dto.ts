import { IsEnum } from 'class-validator';
import { IllustrationKind } from '../../common/enums/illustration-kind.enum';

export class ListIllustrationsDto {
  @IsEnum(IllustrationKind)
  kind: IllustrationKind;
}
