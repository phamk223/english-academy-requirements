require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Reflector } = require('@nestjs/core');
const { RbacGuard } = require('../dist/common/authorization/rbac.guard');
const { RequireRoles, RequirePermission, Public, Authenticated } = require('../dist/common/authorization/access.decorators');
const { Role, Permission } = require('../dist/common/authorization/permissions');
const { UnauthorizedException } = require('@nestjs/common');

test('RBAC defaults to deny and authenticates before checking permissions', async () => {
  class Controller { route() {} }
  const handler = Controller.prototype.route;
  const request = {};
  let roles;
  let authCalls = 0;
  const authentication = { canActivate: async () => {
    authCalls++;
    if (!roles) throw new UnauthorizedException();
    request.currentUser = { roles };
    return true;
  } };
  const context = { getHandler: () => handler, getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => request }) };
  const guard = new RbacGuard(new Reflector(), authentication);
  await assert.rejects(guard.canActivate(context), e => e.getStatus() === 401);
  roles = [Role.STUDENT];
  await assert.rejects(guard.canActivate(context), e => e.getStatus() === 403);
  RequireRoles(Role.ADMIN)(Controller);
  await assert.rejects(guard.canActivate(context), e => e.getStatus() === 403);
  roles = [Role.STUDENT, Role.ADMIN];
  assert.equal(await guard.canActivate(context), true);
  RequirePermission(Permission.OWN_PROGRESS_READ)(Controller.prototype, 'route', Object.getOwnPropertyDescriptor(Controller.prototype, 'route'));
  roles = [Role.ADMIN];
  await assert.rejects(guard.canActivate(context), e => e.getStatus() === 403);
  roles = [Role.STUDENT];
  assert.equal(await guard.canActivate(context), true);
  Authenticated()(Controller.prototype, 'route', Object.getOwnPropertyDescriptor(Controller.prototype, 'route'));
  assert.equal(await guard.canActivate(context), true);
  Public()(Controller.prototype, 'route', Object.getOwnPropertyDescriptor(Controller.prototype, 'route'));
  const before = authCalls;
  roles = undefined;
  assert.equal(await guard.canActivate(context), true);
  assert.equal(authCalls, before);
});
