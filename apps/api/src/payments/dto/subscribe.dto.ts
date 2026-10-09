import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubscribeDto {
  @IsString()
  planCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  referralCode?: string;
}
