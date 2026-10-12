require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NestFactory } = require('@nestjs/core');
const { Module } = require('@nestjs/common');
const { HealthController } = require('../dist/modules/health/health.controller');
const { HealthService } = require('../dist/modules/health/health.service');
const { DatabaseService } = require('../dist/database/database.service');
const { configureApplication } = require('../dist/config/configure-application');

test('HTTP health reports DB readiness without exposing database errors', async () => {
  let available = true;
  class TestModule {}
  Module({
    controllers: [HealthController],
    providers: [HealthService, { provide: DatabaseService, useValue: {
      checkConnection: async () => { if (!available) throw new Error('secret database detail'); },
    } }],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false, bodyParser: false });
  configureApplication(app);
  await app.listen(0, '127.0.0.1');
  try {
    const url = await app.getUrl();
    const healthy = await fetch(`${url}/health`);
    assert.equal(healthy.status, 200);
    assert.equal(healthy.headers.get('cache-control'), 'no-store');
    const payload = await healthy.json();
    assert.equal(payload.success, true);
    assert.deepEqual(payload.data, { status: 'ok', database: 'up' });
    assert.equal(payload.meta.requestId, healthy.headers.get('x-request-id'));
    available = false;
    const unhealthy = await fetch(`${url}/health`);
    assert.equal(unhealthy.status, 503);
    assert.equal((await unhealthy.text()).includes('secret'), false);
    assert.equal((await fetch(`${url}/missing`)).status, 404);
  } finally { await app.close(); }
});
