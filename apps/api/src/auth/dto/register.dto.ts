import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  /** Cloudflare Turnstile token */
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
