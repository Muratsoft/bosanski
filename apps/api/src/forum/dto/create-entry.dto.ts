import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEntryDto {
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  body: string;
}
