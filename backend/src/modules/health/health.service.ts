import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class HealthService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  async check() {
    try {
      await this.database.checkConnection();
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException('Service unavailable');
    }
  }
}
