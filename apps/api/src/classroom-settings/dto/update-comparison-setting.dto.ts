import { IsBoolean } from 'class-validator';

// 4.3/7.3 — corpo de PATCH /teacher/classrooms/:id/comparison-setting.
export class UpdateComparisonSettingDto {
  @IsBoolean()
  enabled: boolean;
}
