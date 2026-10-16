import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { PasswordService } from './password.service';
import { authConfig } from './auth.config';

export interface CurrentUser { id: string; username: string; status: string; roles: string[] }
interface Session { id: string; user_id: string; expires_at: Date; revoked_at: Date | null }

@Injectable()
export class AuthService {
  private readonly config = authConfig();
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PasswordService) private readonly passwords: PasswordService,
  ) {}

  private digest(token: string): string { return createHash('sha256').update(token).digest('hex'); }
  private denied(): never { throw new UnauthorizedException(); }

  private async user(client: PoolClient, id: string): Promise<CurrentUser> {
    const result = await client.query<CurrentUser>(`
      SELECT u.id, u.username, u.status,
        COALESCE(array_agg(r.code ORDER BY r.code) FILTER (WHERE r.code IS NOT NULL), ARRAY[]::text[]) AS roles
      FROM academy.users u
      LEFT JOIN academy.user_roles ur ON ur.user_id = u.id
      LEFT JOIN academy.roles r ON r.id = ur.role_id
      WHERE u.id = $1 AND u.deleted_at IS NULL GROUP BY u.id`, [id]);
    const user = result.rows[0];
    if (!user || user.status !== 'ACTIVE' || !user.roles.length) this.denied();
    return user;
  }

  private async tokens(client: PoolClient, session: Session, user: CurrentUser) {
    const refreshToken = randomBytes(32).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const expires = Math.min(now + this.config.accessTtl, Math.floor(session.expires_at.getTime() / 1000));
    const accessToken = await new SignJWT({ sid: session.id })
      .setProtectedHeader({ alg: 'HS256', typ: 'at+jwt' })
      .setSubject(user.id).setIssuer(this.config.issuer).setAudience(this.config.audience)
      .setJti(randomUUID()).setIssuedAt(now).setExpirationTime(expires).sign(this.config.secret);
    await client.query('INSERT INTO academy.refresh_tokens (token_hash, session_id) VALUES ($1, $2)',
      [this.digest(refreshToken), session.id]);
    return {
      accessToken, refreshToken, tokenType: 'Bearer', expiresIn: expires - now,
      sessionExpiresAt: session.expires_at.toISOString(), user,
    };
  }

  async login(username: string, password: string) {
    const found = await this.database.pool.query<{ id: string; password_hash: string }>(
      'SELECT id, password_hash FROM academy.users WHERE username_normalized = lower(btrim($1)) AND deleted_at IS NULL', [username]);
    const candidate = found.rows[0];
    const valid = await this.passwords.verify(candidate?.password_hash, password);
    if (!candidate || !valid) this.denied();
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize account updates against login and recheck credentials after hashing.
      const locked = await client.query('SELECT password_hash FROM academy.users WHERE id = $1 FOR UPDATE', [candidate.id]);
      if (locked.rows[0]?.password_hash !== candidate.password_hash) this.denied();
      const user = await this.user(client, candidate.id);
      const session = await client.query<Session>(`
        INSERT INTO academy.auth_sessions (user_id, expires_at)
        VALUES ($1, now() + $2 * interval '1 second') RETURNING *`, [user.id, this.config.sessionTtl]);
      const result = await this.tokens(client, session.rows[0], user);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async refresh(refreshToken: string) {
    const client = await this.database.pool.connect();
    let committed = false;
    try {
      await client.query('BEGIN');
      const result = await client.query<Session & { used_at: Date | null }>(`
        SELECT s.*, t.used_at FROM academy.refresh_tokens t
        JOIN academy.auth_sessions s ON s.id = t.session_id
        WHERE t.token_hash = $1 FOR UPDATE OF s`, [this.digest(refreshToken)]);
      const session = result.rows[0];
      if (!session) this.denied();
      // Read token again after acquiring session lock (a concurrent request may have rotated it).
      const token = await client.query('SELECT used_at FROM academy.refresh_tokens WHERE token_hash = $1', [this.digest(refreshToken)]);
      if (token.rows[0]?.used_at) {
        await client.query('UPDATE academy.auth_sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE id = $1', [session.id]);
        await client.query('COMMIT');
        committed = true;
        this.denied();
      }
      if (session.revoked_at || session.expires_at.getTime() <= Date.now()) this.denied();
      const user = await this.user(client, session.user_id);
      await client.query('UPDATE academy.refresh_tokens SET used_at = now() WHERE token_hash = $1', [this.digest(refreshToken)]);
      const response = await this.tokens(client, session, user);
      await client.query('COMMIT');
      committed = true;
      return response;
    } catch (error) { if (!committed) await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async logout(refreshToken: string): Promise<void> {
    // Current or already-used token can revoke its own session; unknown tokens are idempotent.
    await this.database.pool.query(`
      UPDATE academy.auth_sessions SET revoked_at = COALESCE(revoked_at, now())
      WHERE id = (SELECT session_id FROM academy.refresh_tokens WHERE token_hash = $1)`, [this.digest(refreshToken)]);
  }

  async authenticate(accessToken: string): Promise<CurrentUser> {
    let subject: string;
    let sessionId: string;
    try {
      const { payload } = await jwtVerify(accessToken, this.config.secret, {
        algorithms: ['HS256'], issuer: this.config.issuer, audience: this.config.audience,
        typ: 'at+jwt', requiredClaims: ['sub', 'sid', 'exp', 'iat', 'jti'],
        maxTokenAge: this.config.accessTtl,
      });
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof payload.sub !== 'string' || !uuid.test(payload.sub) ||
          typeof payload.sid !== 'string' || !uuid.test(payload.sid)) this.denied();
      subject = payload.sub;
      sessionId = payload.sid;
    } catch { this.denied(); }
    const client = await this.database.pool.connect();
    try {
      const session = await client.query(`SELECT id FROM academy.auth_sessions
        WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > now()`, [sessionId, subject]);
      if (!session.rowCount) this.denied();
      return await this.user(client, subject);
    } finally { client.release(); }
  }
}
