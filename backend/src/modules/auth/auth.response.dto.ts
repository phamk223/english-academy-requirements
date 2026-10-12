import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'student01' }) username!: string;
  @ApiProperty({ enum: ['ACTIVE'] }) status!: string;
  @ApiProperty({ type: [String], example: ['STUDENT'], description: 'Current roles from database: ADMIN, TEACHER, STUDENT' }) roles!: string[];
}
export class TokenResponseDto {
  @ApiProperty({ description: 'Paste this JWT into Authorize. Never share tokens.' }) accessToken!: string;
  @ApiProperty({ minLength: 43, maxLength: 43, description: 'Opaque single-use token; replace after every successful refresh' }) refreshToken!: string;
  @ApiProperty({ enum: ['Bearer'] }) tokenType!: string;
  @ApiProperty({ example: 900 }) expiresIn!: number;
  @ApiProperty({ format: 'date-time' }) sessionExpiresAt!: string;
  @ApiProperty({ type: CurrentUserDto }) user!: CurrentUserDto;
}
