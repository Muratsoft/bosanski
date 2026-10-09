import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateHomeworkDto {
  @IsString()
  groupId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  attachmentName?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
