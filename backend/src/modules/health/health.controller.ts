import { Controller, Get, Header, Inject } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../../common/authorization/access.decorators';

@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}
  @Get()
  @Public()
  @Header('Cache-Control', 'no-store')
  check() { return this.health.check(); }
}
