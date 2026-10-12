import { Controller, Get, Header, Inject } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../../common/authorization/access.decorators';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ApiErrors, ApiSuccess } from '../../common/api/swagger-responses';

class HealthResponseDto {
  @ApiProperty({ enum: ['ok'] }) status!: string;
  @ApiProperty({ enum: ['up'] }) database!: string;
}

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}
  @Get()
  @ApiOperation({ summary: 'Check API and PostgreSQL readiness' })
  @ApiSuccess(HealthResponseDto)
  @ApiErrors(503, 500)
  @Public()
  @Header('Cache-Control', 'no-store')
  check() { return this.health.check(); }
}
