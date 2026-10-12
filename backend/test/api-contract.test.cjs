require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NestFactory } = require('@nestjs/core');
const { Controller, Module, Post, Get, Body, Query, HttpCode, ConflictException, HttpException } = require('@nestjs/common');
const { IsString, IsNotEmpty, ValidateNested } = require('class-validator');
const { Type } = require('class-transformer');
const { configureApplication } = require('../dist/config/configure-application');
const { PaginationQueryDto } = require('../dist/common/api/pagination-query.dto');
const { paginate } = require('../dist/common/api/contract');

class ProfileDto {}
IsString()(ProfileDto.prototype, 'name');
IsNotEmpty()(ProfileDto.prototype, 'name');
class CreateDto {}
IsString()(CreateDto.prototype, 'username');
ValidateNested()(CreateDto.prototype, 'profile');
Type(() => ProfileDto)(CreateDto.prototype, 'profile');

class FixtureController {
  create(body) { return body; }
  list(query) { return paginate([], 0, query.page, query.limit); }
  crash() { throw new Error('secret connection string and stack'); }
  conflict() { throw new ConflictException('secret database constraint'); }
  unavailable() { throw new HttpException({ message: 'secret infrastructure' }, 503); }
  empty() {}
}
Controller('fixture')(FixtureController);
for (const [method, decorator, dto, param] of [
  ['create', Post(), CreateDto, Body()],
  ['list', Get(), PaginationQueryDto, Query()],
]) {
  decorator(FixtureController.prototype, method, Object.getOwnPropertyDescriptor(FixtureController.prototype, method));
  Reflect.defineMetadata('design:paramtypes', [dto], FixtureController.prototype, method);
  param(FixtureController.prototype, method, 0);
}
for (const method of ['crash', 'conflict', 'unavailable', 'empty']) {
  Get(method)(FixtureController.prototype, method, Object.getOwnPropertyDescriptor(FixtureController.prototype, method));
}
HttpCode(204)(FixtureController.prototype, 'empty', Object.getOwnPropertyDescriptor(FixtureController.prototype, 'empty'));
class FixtureModule {}
Module({ controllers: [FixtureController] })(FixtureModule);

test('shared contract covers validation, pagination, parser errors, status codes and secret redaction', async () => {
  const app = await NestFactory.create(FixtureModule, { logger: false, bodyParser: false });
  configureApplication(app);
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  async function request(path, options) {
    const response = await fetch(base + path, options);
    const body = await response.json();
    assert.equal(body.meta.requestId, response.headers.get('x-request-id'));
    assert.match(body.meta.requestId, /^[0-9a-f-]{36}$/);
    assert.ok(Number.isFinite(Date.parse(body.meta.timestamp)));
    assert.equal(JSON.stringify(body).includes('secret'), false);
    assert.equal(Object.hasOwn(body, 'stack'), false);
    return { response, body };
  }
  try {
    const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const invalid = await request('/fixture', post(JSON.stringify({ username: 42, profile: { name: '' }, extra: 'secret' })));
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.success, false);
    assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    const fields = invalid.body.error.fields;
    assert.ok(fields.some(e => e.field === 'username' && e.code === 'isString'));
    assert.ok(fields.some(e => e.field === 'profile.name' && e.code === 'isNotEmpty'));
    assert.ok(fields.some(e => e.field === 'extra' && e.code === 'whitelistValidation'));
    const valid = await request('/fixture', post(JSON.stringify({ username: 'student', profile: { name: 'Student' } })));
    assert.equal(valid.response.status, 201);
    assert.equal(valid.body.success, true);
    assert.equal(valid.body.data.username, 'student');
    const list = await request('/fixture');
    assert.deepEqual(list.body.data, []);
    assert.deepEqual(list.body.meta.pagination, { page: 1, limit: 20, total: 0, totalPages: 0 });
    const query = await request('/fixture?page=2&limit=10');
    assert.equal(query.body.meta.pagination.page, 2);
    for (const queryString of ['page=0', 'limit=101', 'page=nope', 'page=1&page=2', 'unexpected=true']) {
      const result = await request(`/fixture?${queryString}`);
      assert.equal(result.response.status, 400);
      assert.equal(result.body.error.code, 'VALIDATION_ERROR');
    }
    for (const [path, status, code] of [
      ['/fixture/crash', 500, 'INTERNAL_SERVER_ERROR'],
      ['/fixture/conflict', 409, 'CONFLICT'],
      ['/fixture/unavailable', 503, 'SERVICE_UNAVAILABLE'],
      ['/missing', 404, 'NOT_FOUND'],
    ]) {
      const result = await request(path, { headers: { 'X-Request-Id': 'secret-client-value' } });
      assert.equal(result.response.status, status);
      assert.equal(result.body.error.code, code);
    }
    const malformed = await request('/fixture', post('{"secret":'));
    assert.equal(malformed.response.status, 400);
    assert.equal(malformed.body.error.code, 'BAD_REQUEST');
    const oversized = await request('/fixture', post(JSON.stringify({ username: 'x'.repeat(110000) })));
    assert.equal(oversized.response.status, 413);
    assert.equal(oversized.body.error.code, 'PAYLOAD_TOO_LARGE');
    const empty = await fetch(base + '/fixture/empty');
    assert.equal(empty.status, 204);
    assert.equal(await empty.text(), '');
    assert.deepEqual(paginate([1, 2], 21, 1, 2).pagination, { page: 1, limit: 2, total: 21, totalPages: 11 });
  } finally { await app.close(); }
});
