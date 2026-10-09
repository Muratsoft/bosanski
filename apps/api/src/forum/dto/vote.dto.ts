import { IsIn, IsInt } from 'class-validator';

export class VoteDto {
  @IsInt()
  @IsIn([1, -1])
  value: 1 | -1;
}
