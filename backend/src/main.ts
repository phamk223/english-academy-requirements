import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applicationPort } from './config/environment';
import { configureApplication } from './config/configure-application';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApplication(app);
  await app.listen(applicationPort(), '0.0.0.0');
}
void bootstrap().catch(() => {
  Logger.error('Application startup failed; check configuration and database availability');
  process.exit(1);
});
