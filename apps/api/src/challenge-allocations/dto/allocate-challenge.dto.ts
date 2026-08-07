import { IsUUID } from 'class-validator';

export class AllocateChallengeDto {
  @IsUUID()
  classroomId: string;
}
