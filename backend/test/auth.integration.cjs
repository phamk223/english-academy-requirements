// Run from backend/app cwd; requires PostgreSQL with all migrations and JWT_SECRET.
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require(process.cwd() + '/dist/app.module');
const { configureApplication } = require(process.cwd() + '/dist/config/configure-application');
const { DatabaseService } = require(process.cwd() + '/dist/database/database.service');
const { PasswordService } = require(process.cwd() + '/dist/modules/auth/password.service');
const { authConfig } = require(process.cwd() + '/dist/modules/auth/auth.config');

test('auth lifecycle and security against real PostgreSQL', async () => {
  const app = await NestFactory.create(AppModule, { logger: false, bodyParser: false });
  configureApplication(app);
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const pool = app.get(DatabaseService).pool;
  const passwords = app.get(PasswordService);
  const prefix = 'test_' + randomBytes(8).toString('hex');
  const password = randomBytes(24).toString('base64url');
  const ids = [];
  async function request(path, body, token) {
    const response = await fetch(base + '/auth/' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await response.json();
    assert.equal(payload.meta.requestId, response.headers.get('x-request-id'));
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(JSON.stringify(payload).includes('password_hash'), false);
    return { status: response.status, data: payload.data, error: payload.error, headers: response.headers };
  }
  const login = username => request('login', { username, password });
  const refresh = refreshToken => request('refresh', { refreshToken });
  const me = accessToken => request('me', undefined, accessToken);
  async function user(suffix, status, roles) {
    const hash = await passwords.hash(password);
    assert.notEqual(hash, password);
    assert.ok(hash.startsWith('$argon2id$'));
    assert.equal(await passwords.verify(hash, password), true);
    assert.equal(await passwords.verify(hash, 'wrong-password'), false);
    const username = prefix + suffix;
    const result = await pool.query('INSERT INTO academy.users (username, password_hash, status) VALUES ($1, $2, $3) RETURNING id', [username, hash, status]);
    const id = result.rows[0].id;
    ids.push(id);
    await pool.query(`INSERT INTO academy.user_roles (user_id, role_id)
      SELECT $1, id FROM academy.roles WHERE code = ANY($2::text[])`, [id, roles]);
    return { username, id };
  }
  try {
    for (const role of ['ADMIN', 'TEACHER', 'STUDENT']) {
      const account = await user(role, 'ACTIVE', [role]);
      const signed = await login(account.username.toUpperCase());
      assert.equal(signed.status, 200);
      assert.ok(signed.data.expiresIn > 0 && signed.data.expiresIn <= authConfig().accessTtl);
      assert.deepEqual(signed.data.user.roles, [role]);
      const current = await me(signed.data.accessToken);
      assert.equal(current.status, 200);
      assert.deepEqual(current.data, { id: account.id, username: account.username, status: 'ACTIVE', roles: [role] });
      const digest = createHash('sha256').update(signed.data.refreshToken).digest('hex');
      assert.equal((await pool.query('SELECT token_hash FROM academy.refresh_tokens WHERE token_hash = $1', [digest])).rowCount, 1);
      const rotated = await refresh(signed.data.refreshToken);
      assert.equal(rotated.status, 200);
      assert.notEqual(rotated.data.refreshToken, signed.data.refreshToken);
      assert.equal(rotated.data.sessionExpiresAt, signed.data.sessionExpiresAt);
      assert.equal((await me(rotated.data.accessToken)).status, 200);
      assert.equal((await request('logout', { refreshToken: rotated.data.refreshToken })).status, 200);
      assert.equal((await request('logout', { refreshToken: rotated.data.refreshToken })).status, 200);
      assert.equal((await me(signed.data.accessToken)).status, 401);
      assert.equal((await me(rotated.data.accessToken)).status, 401);
      assert.equal((await refresh(rotated.data.refreshToken)).status, 401);
    }
    const active = await user('active', 'ACTIVE', ['STUDENT']);
    const locked = await user('locked', 'LOCKED', ['STUDENT']);
    const inactive = await user('inactive', 'INACTIVE', ['STUDENT']);
    const failures = [
      await login(prefix + '_missing'),
      await request('login', { username: active.username, password: 'wrong-password' }),
      await login(locked.username), await login(inactive.username),
    ];
    for (const result of failures) {
      assert.equal(result.status, 401);
      assert.deepEqual(result.error, failures[0].error);
    }
    const signed = (await login(active.username)).data;
    await pool.query(`INSERT INTO academy.user_roles (user_id, role_id) SELECT $1, id FROM academy.roles WHERE code = 'TEACHER'`, [active.id]);
    assert.deepEqual((await me(signed.accessToken)).data.roles, ['STUDENT', 'TEACHER']);
    await pool.query("UPDATE academy.users SET status = 'LOCKED' WHERE id = $1", [active.id]);
    assert.equal((await me(signed.accessToken)).status, 401);
    assert.equal((await refresh(signed.refreshToken)).status, 401);
    await pool.query("UPDATE academy.users SET status = 'ACTIVE' WHERE id = $1", [active.id]);
    assert.equal((await me(signed.accessToken)).status, 401);
    const replay = (await login(active.username)).data;
    const rotated = (await refresh(replay.refreshToken)).data;
    assert.equal((await refresh(replay.refreshToken)).status, 401);
    assert.equal((await me(rotated.accessToken)).status, 401);
    assert.equal((await refresh(rotated.refreshToken)).status, 401);
    const concurrent = (await login(active.username)).data;
    const raced = await Promise.all([refresh(concurrent.refreshToken), refresh(concurrent.refreshToken)]);
    assert.deepEqual(raced.map(r => r.status).sort(), [200, 401]);
    assert.equal((await me(raced.find(r => r.status === 200).data.accessToken)).status, 401);

    const changed = (await login(active.username)).data;
    await pool.query('UPDATE academy.users SET password_hash = $1 WHERE id = $2', [await passwords.hash(password + 'new'), active.id]);
    assert.equal((await me(changed.accessToken)).status, 401);
    assert.equal((await refresh(changed.refreshToken)).status, 401);
    const noRole = await user('norole', 'ACTIVE', []);
    assert.equal((await login(noRole.username)).status, 401);
    const expiryUser = await user('expiry', 'ACTIVE', ['ADMIN']);
    const expiry = (await login(expiryUser.username)).data;
    const { decodeJwt, SignJWT } = await import('jose');
    const decoded = decodeJwt(expiry.accessToken);
    const config = authConfig();
    const makeJwt = (audience, exp) => new SignJWT({ sid: decoded.sid }).setProtectedHeader({ alg: 'HS256', typ: 'at+jwt' })
      .setSubject(expiryUser.id).setIssuer(config.issuer).setAudience(audience).setJti(randomUUID())
      .setIssuedAt(Math.floor(Date.now() / 1000) - 10).setExpirationTime(exp).sign(config.secret);
    assert.equal((await me(await makeJwt(config.audience, Math.floor(Date.now() / 1000) - 1))).status, 401);
    assert.equal((await me(await makeJwt('wrong-audience', Math.floor(Date.now() / 1000) + 100))).status, 401);
    assert.equal((await me()).status, 401);
    assert.equal((await me('invalid.jwt.token')).status, 401);
    assert.equal((await refresh(randomBytes(32).toString('base64url'))).status, 401);
    await pool.query("UPDATE academy.auth_sessions SET created_at = now() - interval '2 days', expires_at = now() - interval '1 day' WHERE id = $1", [decoded.sid]);
    assert.equal((await me(expiry.accessToken)).status, 401);
    assert.equal((await refresh(expiry.refreshToken)).status, 401);
    // The IP limiter also covers invalid requests; no password hashing is needed for this probe.
    let limited;
    for (let i = 0; i < 22; i++) {
      limited = await request('login', {});
      if (limited.status === 429) break;
    }
    assert.equal(limited.status, 429);
    assert.equal(limited.error.code, 'TOO_MANY_REQUESTS');
    assert.ok(limited.headers.get('retry-after'));
  } finally {
    if (ids.length) {
      await pool.query('DELETE FROM academy.user_roles WHERE user_id = ANY($1::uuid[])', [ids]);
      await pool.query('DELETE FROM academy.users WHERE id = ANY($1::uuid[])', [ids]);
    }
    await app.close();
  }
});
