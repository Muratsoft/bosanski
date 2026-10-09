import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SubmitHomeworkDto {
  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
