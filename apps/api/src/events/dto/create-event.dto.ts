import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { EventCategory } from '../../common/enums/event-category.enum';

export class CreateEventDto {
  @IsString()
  @MaxLength(64)
  studentPseudoId: string;

  @IsEnum(EventCategory)
  category: EventCategory;

  @IsString()
  @MaxLength(80)
  type: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  challengeId?: string;
}
