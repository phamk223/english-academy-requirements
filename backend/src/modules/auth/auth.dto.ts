import { IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @Length(43, 43)
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  refreshToken!: string;
}
