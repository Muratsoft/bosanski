import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note?: string;
}
