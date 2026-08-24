import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniGameLevel } from './entities/mini-game-level.entity';
import { MinigamesController } from './minigames.controller';
import { MinigamesService } from './minigames.service';
import { TeacherMinigamesController } from './teacher-minigames.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MiniGameLevel])],
  controllers: [MinigamesController, TeacherMinigamesController],
  providers: [MinigamesService],
  exports: [MinigamesService],
})
export class MinigamesModule {}
