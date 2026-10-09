import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { GameType } from '@prisma/client';

export class SaveScoreDto {
  @IsEnum(GameType)
  gameType: GameType;

  @IsInt()
  @Min(0)
  score: number;

  @IsInt()
  @Min(1)
  @Max(50)
  total: number;

  @IsInt()
  @Min(0)
  @Max(3600)
  durationSec: number;
}
