import 'dotenv/config';

function seconds(name: string, fallback: number, maximum: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new Error(`Invalid ${name}`);
  return value;
}

export function authConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret || !/^[0-9a-f]{64,128}$/i.test(secret)) {
    throw new Error('JWT_SECRET must be a randomly generated 32-64 byte hex secret');
  }
  return {
    secret: Buffer.from(secret, 'hex'),
    issuer: 'english-academy',
    audience: 'english-academy-api',
    accessTtl: seconds('ACCESS_TOKEN_TTL_SECONDS', 900, 3600),
    sessionTtl: seconds('SESSION_TTL_SECONDS', 604800, 2592000),
  };
}
