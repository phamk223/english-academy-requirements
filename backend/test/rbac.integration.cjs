require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { NestFactory } = require('@nestjs/core');
const { Controller, Get, Module } = require('@nestjs/common');
const load = path => require(process.cwd() + '/dist/' + path);
const { AppModule } = load('app.module');
const { configureApplication } = load('config/configure-application');
const { DatabaseService } = load('database/database.service');
const { PasswordService } = load('modules/auth/password.service');
const { Public, Authenticated, RequireRoles, RequirePermission } = load('common/authorization/access.decorators');
const { Permission, Role, PERMISSION_ROLES, hasPermission } = load('common/authorization/permissions');

class ProtectedController {
  admin() { return { allowed: true }; }
  teacher() { return { allowed: true }; }
  student() { return { allowed: true }; }
  reports() { return { allowed: true }; }
  learning() { return { allowed: true }; }
  self() { return { allowed: true }; }
  emptyRoles() { return { allowed: true }; }
  public() { return { allowed: true }; }
  authenticated() { return { allowed: true }; }
}
Controller('rbac-fixture')(ProtectedController);
RequireRoles(Role.ADMIN)(ProtectedController);
const policies = {
  teacher: RequireRoles(Role.TEACHER), student: RequireRoles(Role.STUDENT),
  reports: RequirePermission(Permission.REPORTS_READ), learning: RequirePermission(Permission.ASSIGNED_LESSONS_READ),
  self: RequirePermission(Permission.SELF_READ), emptyRoles: RequireRoles(),
  public: Public(), authenticated: Authenticated(),
};
for (const name of Object.getOwnPropertyNames(ProtectedController.prototype).filter(n => n !== 'constructor')) {
  const descriptor = Object.getOwnPropertyDescriptor(ProtectedController.prototype, name);
  Get(name)(ProtectedController.prototype, name, descriptor);
  policies[name]?.(ProtectedController.prototype, name, descriptor);
}
class MissingPolicyController { get() { return { allowed: true }; } }
Controller('rbac-unconfigured')(MissingPolicyController);
Get()(MissingPolicyController.prototype, 'get', Object.getOwnPropertyDescriptor(MissingPolicyController.prototype, 'get'));
class TestModule {}
Module({ imports: [AppModule], controllers: [ProtectedController, MissingPolicyController] })(TestModule);

test('global RBAC enforces DB-backed roles, method overrides, 401/403 and default deny', async () => {
  const app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApplication(app);
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const pool = app.get(DatabaseService).pool;
  const passwords = app.get(PasswordService);
  const prefix = 'rbac_' + randomBytes(8).toString('hex');
  const password = randomBytes(24).toString('base64url');
  const ids = [];
  async function get(path, token, extraHeaders = {}) {
    const response = await fetch(base + path, { headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extraHeaders,
    } });
    const body = await response.json();
    assert.equal(body.meta.requestId, response.headers.get('x-request-id'));
    if (response.status === 401) assert.equal(body.error.code, 'UNAUTHORIZED');
    if (response.status === 403) assert.deepEqual(body.error, { code: 'FORBIDDEN', message: 'Access denied' });
    return response.status;
  }
  try {
    const accounts = {};
    for (const role of Object.values(Role)) {
      const inserted = await pool.query('INSERT INTO academy.users (username, password_hash) VALUES ($1, $2) RETURNING id',
        [prefix + role, await passwords.hash(password)]);
      const id = inserted.rows[0].id;
      ids.push(id);
      await pool.query('INSERT INTO academy.user_roles (user_id, role_id) SELECT $1, id FROM academy.roles WHERE code = $2', [id, role]);
      const response = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: prefix + role, password }) });
      assert.equal(response.status, 200);
      accounts[role] = { id, ...(await response.json()).data };
    }
    const admin = accounts.ADMIN.accessToken;
    const teacher = accounts.TEACHER.accessToken;
    const student = accounts.STUDENT.accessToken;
    for (const endpoint of ['admin', 'teacher', 'student', 'reports', 'learning', 'self', 'emptyRoles', 'authenticated']) {
      assert.equal(await get('/rbac-fixture/' + endpoint), 401);
      assert.equal(await get('/rbac-fixture/' + endpoint, 'invalid.jwt.token'), 401);
    }
    for (const [token, role] of [[admin, Role.ADMIN], [teacher, Role.TEACHER], [student, Role.STUDENT]]) {
      for (const endpoint of ['admin', 'teacher', 'student']) {
        assert.equal(await get('/rbac-fixture/' + endpoint, token), role.toLowerCase() === endpoint ? 200 : 403);
      }
      assert.equal(await get('/rbac-fixture/self', token), 200);
      assert.equal(await get('/rbac-fixture/authenticated', token), 200);
      assert.equal(await get('/rbac-fixture/emptyRoles', token), 403);
      assert.equal(await get('/rbac-unconfigured', token), 403);
      assert.equal(await get('/auth/me', token), 200);
    }
    assert.equal(await get('/rbac-unconfigured'), 401);
    assert.equal(await get('/rbac-fixture/public'), 200);
    assert.equal(await get('/rbac-fixture/public', 'invalid.jwt.token'), 200);
    assert.equal(await get('/health'), 200);
    assert.equal(await get('/rbac-fixture/reports', admin), 200);
    assert.equal(await get('/rbac-fixture/reports', teacher), 403);
    assert.equal(await get('/rbac-fixture/reports', student), 403);
    assert.equal(await get('/rbac-fixture/learning', student), 200);
    assert.equal(await get('/rbac-fixture/learning', admin), 403);
    assert.equal(await get('/rbac-fixture/learning', teacher), 403);
    // Frontend inputs cannot promote a STUDENT to ADMIN.
    assert.equal(await get('/rbac-fixture/admin?role=ADMIN', student, { 'X-Role': 'ADMIN' }), 403);
    await pool.query("INSERT INTO academy.user_roles (user_id, role_id) SELECT $1, id FROM academy.roles WHERE code = 'ADMIN'", [accounts.STUDENT.id]);
    assert.equal(await get('/rbac-fixture/admin', student), 200);
    assert.equal(await get('/rbac-fixture/student', student), 200);
    await pool.query("DELETE FROM academy.user_roles WHERE user_id = $1 AND role_id = (SELECT id FROM academy.roles WHERE code = 'ADMIN')", [accounts.STUDENT.id]);
    assert.equal(await get('/rbac-fixture/admin', student), 403);
    assert.equal(await get('/rbac-fixture/student', student), 200);
    await pool.query("UPDATE academy.users SET status = 'LOCKED' WHERE id = $1", [accounts.ADMIN.id]);
    assert.equal(await get('/rbac-fixture/admin', admin), 401);
    for (const permission of Object.values(Permission)) {
      for (const role of Object.values(Role)) {
        assert.equal(hasPermission([role], permission), PERMISSION_ROLES[permission].includes(role));
      }
      assert.equal(hasPermission(['SUPER_ADMIN', 'unknown'], permission), false);
    }
    assert.equal(hasPermission([Role.ADMIN], 'unknown:permission'), false);
  } finally {
    if (ids.length) {
      await pool.query('DELETE FROM academy.user_roles WHERE user_id = ANY($1::uuid[])', [ids]);
      await pool.query('DELETE FROM academy.users WHERE id = ANY($1::uuid[])', [ids]);
    }
    await app.close();
  }
});
