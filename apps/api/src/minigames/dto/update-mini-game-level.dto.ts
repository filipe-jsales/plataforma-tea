import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import type { FractionsFactoryFraction } from '../mini-game-level-config.interface';

// PATCH /teacher/minigames/levels/:id — mesmo racional de
// SaveTemplateChallengeDto: decorators aqui só validam a FORMA do payload
// (string/objeto/array), a semântica pedagógica (denominador 2-8, tema
// dentro do enum, etc.) é responsabilidade de MiniGamesService, que devolve
// mensagem descritiva por campo, nunca um 400 genérico.
export class UpdateMiniGameLevelDto {
  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsObject()
  targetFraction?: FractionsFactoryFraction;

  @IsOptional()
  @IsArray()
  fractionPool?: FractionsFactoryFraction[];
}
