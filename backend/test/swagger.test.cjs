require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NestFactory } = require('@nestjs/core');
const { Module } = require('@nestjs/common');
const { AuthController } = require('../dist/modules/auth/auth.controller');
const { AuthService } = require('../dist/modules/auth/auth.service');
const { AuthGuard } = require('../dist/modules/auth/auth.guard');
const { configureApplication } = require('../dist/config/configure-application');
const { configureSwagger } = require('../dist/config/swagger');

test('Swagger serves UI and accurate auth request/response schemas', async () => {
  class TestModule {}
  Module({ controllers: [AuthController], providers: [
    { provide: AuthService, useValue: {} }, { provide: AuthGuard, useValue: {} },
  ] })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApplication(app);
  configureSwagger(app);
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    const html = await fetch(base + '/docs');
    assert.equal(html.status, 200);
    assert.ok((await html.text()).includes('swagger-ui'));
    const response = await fetch(base + '/docs-json');
    assert.equal(response.status, 200);
    const spec = await response.json();
    assert.equal(spec.components.securitySchemes['access-token'].scheme, 'bearer');
    const me = spec.paths['/auth/me'].get;
    assert.deepEqual(me.security, [{ 'access-token': [] }]);
    assert.ok(me.responses['401']);
    assert.ok(me.responses['403']);
    assert.equal(me.responses['403'].content['application/json'].example.error.code, 'FORBIDDEN');
    assert.equal(me.responses['500'].content['application/json'].example.error.code, 'INTERNAL_SERVER_ERROR');
    for (const route of ['login', 'refresh', 'logout']) {
      const operation = spec.paths['/auth/' + route].post;
      assert.equal(operation.security, undefined);
      assert.ok(operation.requestBody.content['application/json']);
      assert.ok(operation.responses['200'].content['application/json'].schema.properties.meta);
      assert.ok(operation.responses['400']);
    }
    assert.deepEqual(spec.components.schemas.LoginDto.required.sort(), ['password', 'username']);
    assert.equal(spec.components.schemas.LoginDto.properties.password.format, 'password');
    assert.equal(spec.components.schemas.RefreshTokenDto.properties.refreshToken.maxLength, 43);
    assert.ok(spec.components.schemas.ErrorDetailsDto.properties.fields);
    assert.ok(spec.components.schemas.TokenResponseDto.properties.user);
    const init = await fetch(base + '/docs/swagger-ui-init.js');
    assert.ok((await init.text()).includes('"persistAuthorization": false'));
  } finally { await app.close(); }
});
