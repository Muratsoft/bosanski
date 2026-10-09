import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewPaymentDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectReason?: string;
}
