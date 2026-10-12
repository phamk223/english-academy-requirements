// Read credentials from stdin, never from command arguments or source-controlled seed files.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const { PasswordService } = require('../dist/modules/auth/password.service');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 8192) throw new Error('Input too large');
  }
  const { username, password, roles } = JSON.parse(input);
  if (typeof username !== 'string' || !username.trim() || username !== username.trim() || username.length > 100 ||
      typeof password !== 'string' || password.length < 15 || password.length > 1024 ||
      !Array.isArray(roles) || !roles.length || roles.some(role => !['ADMIN', 'TEACHER', 'STUDENT'].includes(role))) {
    throw new Error('Invalid user input');
  }
  const hash = await new PasswordService().hash(password);
  const client = new Client({ connectionString: process.env.DATABASE_URL || undefined, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('INSERT INTO academy.users (username, password_hash) VALUES ($1, $2) RETURNING id', [username, hash]);
    const assigned = await client.query(`INSERT INTO academy.user_roles (user_id, role_id)
      SELECT $1, id FROM academy.roles WHERE code = ANY($2::text[]) RETURNING role_id`, [result.rows[0].id, [...new Set(roles)]]);
    if (assigned.rowCount !== new Set(roles).size) throw new Error('Roles not seeded');
    await client.query('COMMIT');
    console.log('User created');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
main().catch(() => { console.error('User creation failed; check input, role seed and unique username'); process.exitCode = 1; });
