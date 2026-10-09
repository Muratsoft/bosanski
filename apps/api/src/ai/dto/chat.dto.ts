import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AiMode, LangVariant } from '@prisma/client';

export class ChatDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsEnum(AiMode)
  mode?: AiMode;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  level?: string;

  @IsOptional()
  @IsEnum(LangVariant)
  variant?: LangVariant;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  lessonContext?: string;
}
