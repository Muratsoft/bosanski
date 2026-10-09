import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { LangVariant } from '@prisma/client';

export class CreateDictionaryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  wordTr: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  wordTarget: string;

  @IsOptional()
  @IsEnum(LangVariant)
  variant?: LangVariant;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phonetic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  partOfSpeech?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  exampleTr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  exampleTarget?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
