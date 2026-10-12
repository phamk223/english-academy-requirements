import 'dotenv/config';

export function databaseConfig() {
  if (!process.env.DATABASE_URL &&
      (!process.env.PGHOST || !process.env.PGDATABASE || !process.env.PGUSER || !process.env.PGPASSWORD)) {
    throw new Error('Database configuration is required');
  }
  return {
    connectionString: process.env.DATABASE_URL || undefined,
    max: 10,
    connectionTimeoutMillis: 3000,
    query_timeout: 3000,
    statement_timeout: 3000,
    idleTimeoutMillis: 30000,
  };
}

export function applicationPort(): number {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}
