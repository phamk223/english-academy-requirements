import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { databaseConfig } from '../config/environment';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  readonly pool = new Pool(databaseConfig());

  constructor() {
    this.pool.on('error', () => this.logger.error('Database pool connection error'));
  }
  async onModuleInit() { await this.checkConnection(); }
  async checkConnection(): Promise<void> { await this.pool.query('SELECT 1'); }
  async onModuleDestroy() { await this.pool.end(); }
}
