require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const { readdir, readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { createHash } = require('node:crypto');

async function migrate() {
  if (!process.env.DATABASE_URL && !(process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER && process.env.PGPASSWORD)) {
    throw new Error('Missing database configuration');
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL || undefined, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '15s'");
    await client.query('SELECT pg_advisory_xact_lock(8701001)');
    await client.query('CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const directory = join(__dirname, '..', 'migrations');
    for (const name of (await readdir(directory)).filter(n => /^\d+_[\w-]+\.sql$/.test(n)).sort()) {
      const sql = await readFile(join(directory, name), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM public.schema_migrations WHERE name = $1', [name]);
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum) throw new Error('Applied migration changed');
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)', [name, checksum]);
      console.log(`Applied ${name}`);
    }
    await client.query('COMMIT');
    console.log('Migrations complete');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { await client.end(); }
}
migrate().catch(() => { console.error('Migration failed; check configuration, database and migration checksums'); process.exitCode = 1; });
