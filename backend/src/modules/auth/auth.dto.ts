import { IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'student01', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username!: string;

  @ApiProperty({ format: 'password', minLength: 1, maxLength: 1024, description: 'Password of an existing account; no default password is seeded', writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ minLength: 43, maxLength: 43, pattern: '^[A-Za-z0-9_-]{43}$', description: 'Copy data.refreshToken from login or the latest refresh response', writeOnly: true })
  @IsString()
  @Length(43, 43)
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  refreshToken!: string;
}
