import { IsBoolean } from 'class-validator';

export class UpdateSensoryProfileDto {
  @IsBoolean()
  soundEnabled: boolean;

  @IsBoolean()
  animationEnabled: boolean;
}
